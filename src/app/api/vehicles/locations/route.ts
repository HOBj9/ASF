import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { LiveTrackingService } from '@/lib/services/live-tracking.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { getCachedVehicleSnapshot } from '@/lib/live/branch-live-snapshot-cache';

const liveTrackingService = new LiveTrackingService();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const locations = await getCachedVehicleSnapshot(branchId, () =>
      liveTrackingService.getBranchVehicleLocations(branchId),
    );

    return NextResponse.json({
      data: locations,
      status: 'success',
      message: 'تم جلب مواقع المركبات بنجاح',
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
