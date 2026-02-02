import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import Branch from '@/models/Branch';
import PointVisit from '@/models/PointVisit';
import Point from '@/models/Point';
import { getZonedDayRange } from '@/lib/utils/timezone.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const branch = await Branch.findById(branchId).select('timezone').lean();
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }
    const timezone = branch.timezone || 'Asia/Damascus';

    const { start, end } = getZonedDayRange(timezone);

    const activeVehicleIds = await PointVisit.distinct('vehicleId', {
      branchId,
      status: 'open',
    });
    const activePointIds = await PointVisit.distinct('pointId', {
      branchId,
      status: 'open',
    });

    const visitedPointIdsToday = await PointVisit.distinct('pointId', {
      branchId,
      status: 'closed',
      exitTime: { $gte: start, $lte: end },
    });

    const totalPoints = await Point.countDocuments({ branchId, isActive: true });
    const dailyCompletionPercent =
      totalPoints === 0
        ? 0
        : Math.round((visitedPointIdsToday.length / totalPoints) * 100);

    return NextResponse.json({
      activeVehicles: activeVehicleIds.length,
      activePoints: activePointIds.length,
      dailyCompletionPercent,
      totalPoints,
      visitedPointsToday: visitedPointIdsToday.length,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}


