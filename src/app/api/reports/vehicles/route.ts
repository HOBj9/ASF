import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { toXlsxBuffer } from '@/lib/utils/excel.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { generateVisitsReport, type ReportColumnKey } from '@/lib/services/reports/report-engine.service';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const vehicleId = searchParams.get('vehicleId');
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));

    const columns: ReportColumnKey[] = [
      'vehicleName',
      'plateNumber',
      'pointName',
      'entryTime',
      'exitTime',
      'duration',
    ];

    const report = await generateVisitsReport({
      branchId,
      period: from || to ? 'custom' : 'daily',
      from,
      to,
      vehicleId,
      columns,
      durationUnit: 'seconds',
      status: 'closed',
    });

    const excelBuffer = toXlsxBuffer(report.headers, report.rows);
    const filename = `vehicle-report-${report.range.start.toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
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
