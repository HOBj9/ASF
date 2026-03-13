export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveEventReportScope } from '@/lib/utils/event-report-scope.util';
import {
  generatePointVehiclesReport,
  mapRowsToCsvRows,
} from '@/lib/services/reports/event-report-engine.service';
import { toXlsxBuffer } from '@/lib/utils/excel.util';

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

    const pointIdsRaw = searchParams.getAll('pointIds');
    const pointIds = pointIdsRaw.length > 0
      ? pointIdsRaw.map((id) => id.trim()).filter(Boolean)
      : [];
    const pointIdSingle = String(searchParams.get('pointId') || '').trim();
    const pointIdsResolved = pointIds.length > 0 ? pointIds : (pointIdSingle ? [pointIdSingle] : []);

    if (pointIdsResolved.length === 0) {
      return NextResponse.json({ error: 'يرجى تحديد النقطة' }, { status: 400 });
    }

    const from = parseDateTime(searchParams.get('from'));
    const to = parseDateTime(searchParams.get('to'));

    const report = await generatePointVehiclesReport({
      scope,
      pointIds: pointIdsResolved,
      from,
      to,
    });

    const csvRows = mapRowsToCsvRows(report.rows, report.headers);
    const excelBuffer = toXlsxBuffer(
      report.headers.map((header) => header.label),
      csvRows
    );
    const datePart = report.range.from.toISOString().slice(0, 10);
    const filename = `point-events-report-${datePart}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
