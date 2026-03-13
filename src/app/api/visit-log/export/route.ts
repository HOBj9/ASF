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

function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function validObjectIds(ids: (string | null | undefined)[]): string[] {
  return ids
    .map((id) => (id != null ? String(id).trim() : ''))
    .filter((id) => id && id !== 'null' && id !== 'undefined' && /^[a-f0-9]{24}$/i.test(id));
}

type VisitLogTab =
  | 'entries'
  | 'exits'
  | 'visits'
  | 'repeated-entries'
  | 'repeated-exits'
  | 'repeated-points';

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

    if (!from || !to) {
      return NextResponse.json({ error: 'يرجى تحديد من وإلى للفترة الزمنية' }, { status: 400 });
    }
    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ error: 'وقت البداية يجب أن يكون قبل وقت النهاية' }, { status: 400 });
    }

    await connectDB();

    const dateFilter = { $gte: from, $lte: to };
    let headers: string[] = [];
    let csvRows: string[] = [];

    if (tab === 'entries' || tab === 'exits' || tab === 'repeated-entries' || tab === 'repeated-exits') {
      const typeFilter = tab === 'entries' || tab === 'repeated-entries' ? 'zone_in' : 'zone_out';
      const eventFilter: Record<string, unknown> = {
        branchId,
        type: typeFilter,
        eventTimestamp: dateFilter,
      };
      if (pointId) eventFilter.pointId = pointId;
      if (tab === 'repeated-entries') eventFilter.isRepeatedEntry = true;
      if (tab === 'repeated-exits') eventFilter.isOrphanExit = true;

      const events = await ZoneEvent.find(eventFilter).sort({ eventTimestamp: -1 }).lean();

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

      headers = ['معرف الحدث', 'النقطة', 'المركبة', 'لوحة', 'السائق', 'الوقت', 'النوع', 'مكرر'];
      csvRows = (events as any[]).map((e) => {
        const veh = vehicleMap[String(e.vehicleId)];
        const driverName = veh?.driverId ? driverMap[String(veh.driverId)] ?? '' : '';
        const pointName = e.pointId ? (pointMap[String(e.pointId)] ?? '-') : (e.name || '-');
        const typeLabel = e.type === 'zone_in' ? 'دخول' : 'خروج';
        const isRepeated = e.isRepeatedEntry === true || e.isOrphanExit === true;
        return [
          escapeCsvCell(String(e._id)),
          escapeCsvCell(pointName),
          escapeCsvCell(veh?.name ?? '-'),
          escapeCsvCell(veh?.plateNumber ?? ''),
          escapeCsvCell(driverName),
          escapeCsvCell(e.eventTimestamp ? new Date(e.eventTimestamp).toISOString() : ''),
          escapeCsvCell(typeLabel),
          escapeCsvCell(isRepeated ? 'نعم' : 'لا'),
        ].join(',');
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
      ]);

      const pointIds = validObjectIds(agg.map((a) => a._id));
      const points = pointIds.length > 0
        ? await Point.find({ _id: { $in: pointIds } }).select('_id name nameAr').lean()
        : [];
      const pointMap = Object.fromEntries(points.map((p: any) => [String(p._id), p.nameAr || p.name || '-']));

      headers = ['النقطة', 'عدد الزيارات', 'آخر زيارة'];
      csvRows = agg.map((a) =>
        [
          escapeCsvCell(pointMap[String(a._id)] ?? '-'),
          escapeCsvCell(a.visitCount),
          escapeCsvCell(a.lastExitTime ? new Date(a.lastExitTime).toISOString() : ''),
        ].join(',')
      );
    } else {
      const filter: Record<string, unknown> = {
        branchId,
        status: 'closed',
        exitTime: dateFilter,
      };
      if (pointId) filter.pointId = pointId;

      const visits = await PointVisit.find(filter).sort({ exitTime: -1 }).lean();

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

      headers = [
        'معرف الزيارة',
        'النقطة',
        'المركبة',
        'لوحة',
        'السائق',
        'وقت الدخول',
        'وقت الخروج',
        'المدة (ثانية)',
        'نوع الزيارة',
      ];
      csvRows = (visits as any[]).map((v) => {
        const veh = vehicleMap[String(v.vehicleId)];
        const driverName = veh?.driverId ? driverMap[String(veh.driverId)] ?? '' : '';
        const visitKindLabel = v.visitKind === 'repeated' ? 'مكررة' : v.visitKind === 'first' ? 'أولى' : '';
        return [
          escapeCsvCell(String(v._id)),
          escapeCsvCell(pointMap[String(v.pointId)] ?? '-'),
          escapeCsvCell(veh?.name ?? '-'),
          escapeCsvCell(veh?.plateNumber ?? ''),
          escapeCsvCell(driverName),
          escapeCsvCell(v.entryTime ? new Date(v.entryTime).toISOString() : ''),
          escapeCsvCell(v.exitTime ? new Date(v.exitTime).toISOString() : ''),
          escapeCsvCell(v.durationSeconds ?? ''),
          escapeCsvCell(visitKindLabel),
        ].join(',');
      });
    }

    const bom = '\uFEFF';
    const csv = bom + headers.join(',') + '\n' + csvRows.join('\n');
    const filename = `visit-log-${tab}-${from.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
