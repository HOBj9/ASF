import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import Municipality from '@/models/Municipality';
import PointVisit from '@/models/PointVisit';
import { getZonedDayRange } from '@/lib/utils/timezone.util';
import { toCsv } from '@/lib/utils/csv.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(date: Date | null | undefined, timeZone: string): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));
    const pointId = searchParams.get('pointId');
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));

    const municipality = await Municipality.findById(municipalityId).select('timezone').lean();
    const timezone = municipality?.timezone || 'Asia/Damascus';

    let start = from;
    let end = to;
    if (!start || !end) {
      const range = getZonedDayRange(timezone);
      start = start || range.start;
      end = end || range.end;
    }

    if (!start || !end) {
      return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 });
    }

    const query: any = {
      municipalityId,
      status: 'closed',
      exitTime: { $gte: start, $lte: end },
    };
    if (pointId) query.pointId = pointId;

    const visits = await PointVisit.find(query)
      .populate('vehicleId', 'name plateNumber')
      .populate('pointId', 'name nameAr')
      .lean();

    const headers = [
      'اسم الحاوية',
      'اسم الشاحنة/المركبة',
      'رقم اللوحة',
      'وقت الدخول',
      'وقت الخروج',
      'مدة البقاء (ث)',
    ];

    const rows = visits.map((visit: any) => ({
      'اسم الحاوية': visit.pointId?.nameAr || visit.pointId?.name || '',
      'اسم الشاحنة/المركبة': visit.vehicleId?.name || '',
      'رقم اللوحة': visit.vehicleId?.plateNumber || '',
      'وقت الدخول': formatDateTime(visit.entryTime, timezone),
      'وقت الخروج': formatDateTime(visit.exitTime, timezone),
      'مدة البقاء (ث)': visit.durationSeconds ?? '',
    }));

    const csv = toCsv(rows, headers);
    const filename = `point-report-${start.toISOString().slice(0, 10)}.csv`;

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
