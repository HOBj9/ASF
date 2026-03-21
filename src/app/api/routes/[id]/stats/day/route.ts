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

    const dateStr = searchParams.get('date');
    const vehicleIdParam = searchParams.get('vehicleId') || undefined;

    if (!dateStr) {
      return NextResponse.json({ error: 'date مطلوب' }, { status: 400 });
    }

    const vehicleIds = vehicleIdParam ? [vehicleIdParam] : undefined;

    const result = await routeStatsService.getVisitedPointsForDayAll(id, branchId, dateStr, vehicleIds);

    // Order analysis only on within-work-hours visits
    const withinHoursVisits = result.visits.filter((v) => v.withinWorkHours);
    const orderAnalysis = withinHoursVisits.length > 0
      ? await routeStatsService.getVisitOrderAnalysisFromVisits(id, withinHoursVisits)
      : null;

    return NextResponse.json({
      visits: result.visits.map((v) => ({
        _id: v._id,
        pointId: v.pointId,
        vehicleId: v.vehicleId,
        entryTime: v.entryTime.toISOString(),
        exitTime: v.exitTime ? (v.exitTime as Date).toISOString() : undefined,
        durationSeconds: v.durationSeconds,
        withinWorkHours: v.withinWorkHours,
      })),
      visitedPointIds: Array.from(result.visitedPointIds),
      orderAnalysis,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
