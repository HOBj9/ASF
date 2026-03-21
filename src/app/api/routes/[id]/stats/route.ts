export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteStatsService } from '@/lib/services/route-stats.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeStatsService = new RouteStatsService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '30', 10);

    if (!from || !to) {
      return NextResponse.json({ error: 'from و to مطلوبان' }, { status: 400 });
    }

    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T23:59:59.999Z');

    const result = await routeStatsService.getCompletionStats(id, branchId, fromDate, toDate, {
      vehicleId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
