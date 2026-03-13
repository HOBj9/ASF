export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveReportScope } from '@/lib/utils/municipality.util';
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

function parseNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    const scope = resolveReportScope(session, searchParams.get('branchId') || undefined);
    const period = parsePeriod(searchParams.get('period'));
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    const vehicleId = searchParams.get('vehicleId');
    const pointId = searchParams.get('pointId');
    const durationUnit = parseDurationUnit(searchParams.get('durationUnit'));
    const status = parseStatus(searchParams.get('status'));
    const columns = parseColumns(searchParams.get('columns'));
    const page = parseNumber(searchParams.get('page'), 1);
    const pageSize = Math.min(parseNumber(searchParams.get('pageSize'), 20), 200);

    const report = await generateVisitsReport({
      branchId: scope.branchId ?? undefined,
      organizationId: scope.organizationId ?? undefined,
      period,
      from,
      to,
      vehicleId,
      pointId,
      durationUnit,
      columns,
      status,
    });

    const total = report.rows.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const rows = report.rows.slice(startIndex, endIndex);

    return NextResponse.json({
      meta: {
        branchId: report.branchId ?? undefined,
        organizationId: report.organizationId ?? undefined,
        period: report.period,
        from: report.range.start,
        to: report.range.end,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      headers: report.headers,
      summary: report.summary,
      rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
