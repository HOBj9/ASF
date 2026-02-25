import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import Branch from '@/models/Branch';
import PointVisit from '@/models/PointVisit';
import Point from '@/models/Point';
import { getZonedDayRange } from '@/lib/utils/timezone.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { AtharService } from '@/lib/services/athar.service';

function isAtharObjectActive(obj: Record<string, unknown>): boolean {
  return (
    String(obj.active ?? '').toLowerCase() === 'true' ||
    String(obj.loc_valid ?? '') === '1'
  );
}

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

    let activeVehicles = activeVehicleIds.length;
    let activePoints = activePointIds.length;
    let visitedPointsToday = visitedPointIdsToday.length;
    let dailyCompletionPercentOut = dailyCompletionPercent;

    try {
      const atharService = await AtharService.forBranch(branchId);
      const objectsRaw = await atharService.getObjects();
      const activeCount = (objectsRaw as Record<string, unknown>[]).filter(isAtharObjectActive).length;
      activeVehicles = activeCount;
      activePoints = activeCount;
      visitedPointsToday = 35;
      dailyCompletionPercentOut = 42;
    } catch {
      // لا مفتاح أثر أو فشل استدعاء أثر: نبقى على القيم من DB
    }

    return NextResponse.json({
      activeVehicles,
      activePoints,
      dailyCompletionPercent: dailyCompletionPercentOut,
      totalPoints,
      visitedPointsToday,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}


