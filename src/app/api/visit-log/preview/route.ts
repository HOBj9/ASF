export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import PointVisit from '@/models/PointVisit';
import ZoneEvent from '@/models/ZoneEvent';
import Point from '@/models/Point';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import { buildZoneEventPointMatchers } from '@/lib/utils/athar-point.util';

function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function validObjectIds(ids: (string | null | undefined)[]): string[] {
  return ids
    .map((id) => (id != null ? String(id).trim() : ''))
    .filter((id) => id && id !== 'null' && id !== 'undefined' && /^[a-f0-9]{24}$/i.test(id));
}

export type VisitLogTab =
  | 'entries'
  | 'exits'
  | 'visits'
  | 'repeated-entries'
  | 'repeated-exits'
  | 'repeated-points';

export interface VisitLogRow {
  visitId?: string;
  eventId?: string;
  pointId: string;
  pointName: string;
  vehicleId?: string;
  vehicleName: string;
  plateNumber: string | null;
  driverName: string | null;
  entryTime?: string;
  exitTime?: string;
  eventTime?: string;
  durationSeconds?: number | null;
  visitKind?: 'first' | 'repeated' | null;
  eventType?: 'zone_in' | 'zone_out';
  isRepeated?: boolean;
  visitCount?: number;
  lastVisitTime?: string;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const from = parseDateTime(searchParams.get('from'));
    const to = parseDateTime(searchParams.get('to'));
    const pointId = searchParams.get('pointId')?.trim() || null;
    const tabParam = searchParams.get('tab') || 'visits';
    const tab: VisitLogTab = (() => {
      if (['entries', 'exits', 'visits', 'repeated-entries', 'repeated-exits', 'repeated-points'].includes(tabParam))
        return tabParam as VisitLogTab;
      if (tabParam === 'visit-log' || tabParam === 'repeated') return tabParam === 'repeated' ? 'repeated-points' : 'visits';
      return 'visits';
    })();
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 200);

    if (!from || !to) {
      return NextResponse.json({ error: 'يرجى تحديد من وإلى للفترة الزمنية' }, { status: 400 });
    }
    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ error: 'وقت البداية يجب أن يكون قبل وقت النهاية' }, { status: 400 });
    }

    await connectDB();

    const dateFilter = { $gte: from, $lte: to };
    let rows: VisitLogRow[] = [];
    let total = 0;

    if (tab === 'entries' || tab === 'exits' || tab === 'repeated-entries' || tab === 'repeated-exits') {
      const typeFilter = tab === 'entries' || tab === 'repeated-entries' ? 'zone_in' : 'zone_out';
      const eventFilter: Record<string, unknown> = {
        branchId,
        type: typeFilter,
        eventTimestamp: dateFilter,
      };
      if (pointId) {
        const selectedPoint = await Point.findOne({ _id: pointId, branchId })
          .select('_id zoneId name nameAr nameEn')
          .lean();
        if (selectedPoint) {
          eventFilter.$or = buildZoneEventPointMatchers(selectedPoint);
        } else {
          eventFilter.pointId = pointId;
        }
      }
      if (tab === 'repeated-entries') eventFilter.isRepeatedEntry = true;
      if (tab === 'repeated-exits') eventFilter.isOrphanExit = true;

      const [count, events] = await Promise.all([
        ZoneEvent.countDocuments(eventFilter),
        ZoneEvent.find(eventFilter)
          .sort({ eventTimestamp: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);
      total = count;

      const pointIds = validObjectIds((events as any[]).map((e) => e.pointId));
      const vehicleIds = validObjectIds((events as any[]).map((e) => e.vehicleId));
      const points = pointIds.length > 0
        ? await Point.find({ _id: { $in: pointIds } }).select('_id name nameAr').lean()
        : [];
      const pointMap = Object.fromEntries(points.map((p: any) => [String(p._id), p.nameAr || p.name || '-']));
      const vehicles = vehicleIds.length > 0
        ? await Vehicle.find({ _id: { $in: vehicleIds } }).select('_id name plateNumber driverId').lean()
        : [];
      const vehicleMap = Object.fromEntries(vehicles.map((v: any) => [String(v._id), v]));
      const driverIds = validObjectIds(vehicles.map((v: any) => v.driverId));
      const drivers = driverIds.length > 0
        ? await Driver.find({ _id: { $in: driverIds } }).select('_id name').lean()
        : [];
      const driverMap = Object.fromEntries(drivers.map((d: any) => [String(d._id), d.name || '-']));

      rows = (events as any[]).map((e) => {
        const veh = vehicleMap[String(e.vehicleId)];
        const driverName = veh?.driverId ? driverMap[String(veh.driverId)] ?? null : null;
        return {
          eventId: String(e._id),
          pointId: e.pointId ? String(e.pointId) : '',
          pointName: e.pointId ? (pointMap[String(e.pointId)] ?? '-') : (e.name || '-'),
          vehicleId: e.vehicleId ? String(e.vehicleId) : undefined,
          vehicleName: veh?.name ?? e.rawPayload?.name ?? '-',
          plateNumber: veh?.plateNumber ?? null,
          driverName: driverName ?? e.driverName ?? null,
          eventTime: e.eventTimestamp ? new Date(e.eventTimestamp).toISOString() : '',
          eventType: e.type,
          isRepeated: e.isRepeatedEntry === true || e.isOrphanExit === true,
        };
      });
    } else if (tab === 'repeated-points') {
      const visitFilter: Record<string, unknown> = {
        branchId,
        status: 'closed',
        exitTime: dateFilter,
      };
      if (pointId) visitFilter.pointId = pointId;

      const agg = await PointVisit.aggregate([
        { $match: visitFilter },
        { $group: { _id: '$pointId', visitCount: { $sum: 1 }, lastExitTime: { $max: '$exitTime' } } },
        { $match: { visitCount: { $gt: 1 } } },
        { $sort: { visitCount: -1, lastExitTime: -1 } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
      ]);

      const countAgg = await PointVisit.aggregate([
        { $match: visitFilter },
        { $group: { _id: '$pointId', visitCount: { $sum: 1 } } },
        { $match: { visitCount: { $gt: 1 } } },
        { $count: 'total' },
      ]);
      total = countAgg[0]?.total ?? 0;

      const pointIds = validObjectIds(agg.map((a) => a._id));
      const points = pointIds.length > 0
        ? await Point.find({ _id: { $in: pointIds } }).select('_id name nameAr').lean()
        : [];
      const pointMap = Object.fromEntries(points.map((p: any) => [String(p._id), p.nameAr || p.name || '-']));

      rows = agg.map((a) => ({
        pointId: String(a._id),
        pointName: pointMap[String(a._id)] ?? '-',
        vehicleName: '',
        plateNumber: null,
        driverName: null,
        visitCount: a.visitCount,
        lastVisitTime: a.lastExitTime ? new Date(a.lastExitTime).toISOString() : '',
      }));
    } else {
      const filter: Record<string, unknown> = {
        branchId,
        status: 'closed',
        exitTime: dateFilter,
      };
      if (pointId) filter.pointId = pointId;

      const [count, visits] = await Promise.all([
        PointVisit.countDocuments(filter),
        PointVisit.find(filter)
          .sort({ exitTime: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);
      total = count;

      const pointIds = validObjectIds((visits as any[]).map((v) => v.pointId));
      const vehicleIds = validObjectIds((visits as any[]).map((v) => v.vehicleId));
      const points = pointIds.length > 0
        ? await Point.find({ _id: { $in: pointIds } }).select('_id name nameAr').lean()
        : [];
      const pointMap = Object.fromEntries(points.map((p: any) => [String(p._id), p.nameAr || p.name || '-']));
      const vehicles = vehicleIds.length > 0
        ? await Vehicle.find({ _id: { $in: vehicleIds } }).select('_id name plateNumber driverId').lean()
        : [];
      const vehicleMap = Object.fromEntries(vehicles.map((v: any) => [String(v._id), v]));
      const driverIds = validObjectIds(vehicles.map((v: any) => v.driverId));
      const drivers = driverIds.length > 0
        ? await Driver.find({ _id: { $in: driverIds } }).select('_id name').lean()
        : [];
      const driverMap = Object.fromEntries(drivers.map((d: any) => [String(d._id), d.name || '-']));

      rows = (visits as any[]).map((v) => {
        const veh = vehicleMap[String(v.vehicleId)];
        const driverName = veh?.driverId ? driverMap[String(veh.driverId)] ?? null : null;
        return {
          visitId: String(v._id),
          pointId: String(v.pointId),
          pointName: pointMap[String(v.pointId)] ?? '-',
          vehicleId: String(v.vehicleId),
          vehicleName: veh?.name ?? '-',
          plateNumber: veh?.plateNumber ?? null,
          driverName: driverName ?? null,
          entryTime: v.entryTime ? new Date(v.entryTime).toISOString() : '',
          exitTime: v.exitTime ? new Date(v.exitTime).toISOString() : '',
          durationSeconds: v.durationSeconds ?? null,
          visitKind: v.visitKind ?? null,
        };
      });
    }

    return NextResponse.json({
      meta: {
        branchId,
        from: from.toISOString(),
        to: to.toISOString(),
        tab,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      rows,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
