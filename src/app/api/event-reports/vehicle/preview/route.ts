export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveEventReportScope } from '@/lib/utils/event-report-scope.util';
import { generateVehicleEventsReport } from '@/lib/services/reports/event-report-engine.service';

function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('تنسيق التاريخ/الوقت غير صالح');
  }
  return parsed;
}

function parsePositiveInt(value: string | null, fallback: number): number {
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

    const scope = await resolveEventReportScope(session, {
      organizationId: searchParams.get('organizationId'),
      branchId: searchParams.get('branchId'),
    });

    const vehicleIdsRaw = searchParams.getAll('vehicleIds');
    const vehicleIds = vehicleIdsRaw.length > 0
      ? vehicleIdsRaw.map((id) => id.trim()).filter(Boolean)
      : [];
    const vehicleIdSingle = String(searchParams.get('vehicleId') || '').trim();
    const vehicleIdsResolved = vehicleIds.length > 0 ? vehicleIds : (vehicleIdSingle ? [vehicleIdSingle] : []);

    if (vehicleIdsResolved.length === 0) {
      return NextResponse.json({ error: 'يرجى تحديد المركبة' }, { status: 400 });
    }

    const from = parseDateTime(searchParams.get('from'));
    const to = parseDateTime(searchParams.get('to'));
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 200);

    const report = await generateVehicleEventsReport({
      scope,
      vehicleIds: vehicleIdsResolved,
      from,
      to,
    });

    const total = report.rows.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return NextResponse.json({
      meta: {
        organizationId: report.scope.organizationId,
        branchId: report.scope.branchId,
        from: report.range.from.toISOString(),
        to: report.range.to.toISOString(),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      headers: report.headers,
      summary: report.summary,
      rows: report.rows.slice(startIndex, endIndex),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
