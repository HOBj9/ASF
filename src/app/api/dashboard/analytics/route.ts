import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { getZonedDayRange, getZonedMonthStart } from '@/lib/utils/timezone.util';
import Branch from '@/models/Branch';
import PointVisit from '@/models/PointVisit';
import ZoneEvent from '@/models/ZoneEvent';
import Vehicle from '@/models/Vehicle';
import Point from '@/models/Point';
import { permissionActions, permissionResources } from '@/constants/permissions';

function formatMonthLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const num = Math.floor(parsed);
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const dailyDays = parsePositiveInt(searchParams.get('dailyDays'), 14, 7, 60);
    const monthlyMonths = parsePositiveInt(searchParams.get('monthlyMonths'), 12, 3, 24);

    const branch = await Branch.findById(branchId).select('timezone').lean();
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }
    const timezone = branch.timezone || 'Asia/Damascus';

    const { start: todayStart, end: todayEnd } = getZonedDayRange(timezone);
    const dailyStart = new Date(todayStart.getTime() - (dailyDays - 1) * 24 * 60 * 60 * 1000);

    const dailyContainersAgg = await PointVisit.aggregate([
      {
        $match: {
          branchId: branch._id,
          status: 'closed',
          exitTime: { $gte: dailyStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$exitTime', timezone },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyDwellAgg = await PointVisit.aggregate([
      {
        $match: {
          branchId: branch._id,
          status: 'closed',
          exitTime: { $gte: dailyStart, $lte: todayEnd },
          durationSeconds: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$exitTime', timezone },
          },
          avgSeconds: { $avg: '$durationSeconds' },
        },
      },
    ]);

    const dailyEventsAgg = await ZoneEvent.aggregate([
      {
        $match: {
          branchId: branch._id,
          eventTimestamp: { $gte: dailyStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$eventTimestamp', timezone },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const containersMap = new Map(dailyContainersAgg.map((d: any) => [d._id, d.count]));
    const eventsMap = new Map(dailyEventsAgg.map((d: any) => [d._id, d.count]));
    const dwellMap = new Map(dailyDwellAgg.map((d: any) => [d._id, d.avgSeconds]));

    const daily = [];
    for (let i = 0; i < dailyDays; i++) {
      const date = new Date(dailyStart.getTime() + i * 24 * 60 * 60 * 1000);
      const label = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
      daily.push({
        date: label,
        containers: containersMap.get(label) || 0,
        events: eventsMap.get(label) || 0,
        avgMinutes: Math.round(((dwellMap.get(label) || 0) / 60) * 10) / 10,
      });
    }

    const monthStart = getZonedMonthStart(timezone, monthlyMonths - 1);
    const monthEnd = todayEnd;

    const monthlyAgg = await PointVisit.aggregate([
      {
        $match: {
          branchId: branch._id,
          status: 'closed',
          exitTime: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$exitTime', timezone },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyMap = new Map(monthlyAgg.map((d: any) => [d._id, d.count]));
    const monthly = [];
    for (let i = monthlyMonths - 1; i >= 0; i--) {
      const monthDate = getZonedMonthStart(timezone, i);
      const label = formatMonthLabel(monthDate, timezone);
      monthly.push({
        month: label,
        containers: monthlyMap.get(label) || 0,
      });
    }

    const [activeVehicles, inactiveVehicles, pointTypesAgg, eventTypesAgg] = await Promise.all([
      Vehicle.countDocuments({ branchId, isActive: true }),
      Vehicle.countDocuments({ branchId, isActive: false }),
      Point.aggregate([
        { $match: { branchId: branch._id, isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      ZoneEvent.aggregate([
        {
          $match: {
            branchId: branch._id,
            eventTimestamp: { $gte: dailyStart, $lte: todayEnd },
          },
        },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const pointTypeLabels: Record<string, string> = {
      container: 'حاويات',
      station: 'محطات',
      facility: 'منشآت',
      other: 'أخرى',
    };

    const pointTypes = pointTypesAgg.map((item: any) => ({
      type: item._id,
      label: pointTypeLabels[item._id] || item._id,
      count: item.count,
    }));

    const eventsByType = eventTypesAgg.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      daily,
      monthly,
      ranges: {
        dailyDays,
        monthlyMonths,
      },
      vehicleStatus: {
        active: activeVehicles,
        inactive: inactiveVehicles,
      },
      pointTypes,
      eventsByType,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}


