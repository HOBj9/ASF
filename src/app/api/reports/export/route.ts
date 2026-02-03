import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { toCsv } from '@/lib/utils/csv.util';
import {
  generateVisitsReport,
  type DurationUnit,
  type ReportColumnKey,
  type ReportPeriod,
} from '@/lib/services/reports/report-engine.service';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePeriod(value?: string | null): ReportPeriod {
  const candidate = String(value || 'daily').toLowerCase();
  if (candidate === 'weekly' || candidate === 'monthly' || candidate === 'custom') return candidate;
  return 'daily';
}

function parseDurationUnit(value?: string | null): DurationUnit {
  if (value === 'minutes' || value === 'hours') return value;
  return 'seconds';
}

function parseStatus(value?: string | null): 'all' | 'open' | 'closed' {
  if (value === 'open' || value === 'closed') return value;
  return 'all';
}

function parseColumns(value?: string | null): ReportColumnKey[] | undefined {
  if (!value) return undefined;
  const allowed: ReportColumnKey[] = [
    'vehicleName',
    'plateNumber',
    'pointName',
    'entryTime',
    'exitTime',
    'duration',
    'zoneId',
    'status',
  ];

  const requested = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as ReportColumnKey[];

  const valid = requested.filter((column) => allowed.includes(column));
  return valid.length ? valid : undefined;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const period = parsePeriod(searchParams.get('period'));
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    const vehicleId = searchParams.get('vehicleId');
    const pointId = searchParams.get('pointId');
    const durationUnit = parseDurationUnit(searchParams.get('durationUnit'));
    const status = parseStatus(searchParams.get('status'));
    const columns = parseColumns(searchParams.get('columns'));

    const report = await generateVisitsReport({
      branchId,
      period,
      from,
      to,
      vehicleId,
      pointId,
      durationUnit,
      columns,
      status,
    });

    const csv = toCsv(report.rows, report.headers);
    const filename = `report-${period}-${report.range.start.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
