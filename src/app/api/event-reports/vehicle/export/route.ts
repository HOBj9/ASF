import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveEventReportScope } from '@/lib/utils/event-report-scope.util';
import {
  generateVehicleEventsReport,
  mapRowsToCsvRows,
} from '@/lib/services/reports/event-report-engine.service';
import { toCsv } from '@/lib/utils/csv.util';

function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('تنسيق التاريخ/الوقت غير صالح');
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    const scope = await resolveEventReportScope(session, {
      organizationId: searchParams.get('organizationId'),
      branchId: searchParams.get('branchId'),
    });

    const vehicleId = String(searchParams.get('vehicleId') || '').trim();
    if (!vehicleId) {
      return NextResponse.json({ error: 'يرجى تحديد المركبة' }, { status: 400 });
    }

    const from = parseDateTime(searchParams.get('from'));
    const to = parseDateTime(searchParams.get('to'));

    const report = await generateVehicleEventsReport({
      scope,
      vehicleId,
      from,
      to,
    });

    const csvRows = mapRowsToCsvRows(report.rows, report.headers);
    const csv = toCsv(csvRows, report.headers.map((header) => header.label));
    const datePart = report.range.from.toISOString().slice(0, 10);
    const filename = `vehicle-events-report-${datePart}.csv`;

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

