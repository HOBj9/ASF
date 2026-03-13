import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { permissionActions, permissionResources } from "@/constants/permissions";
import { resolveBranchId } from "@/lib/utils/municipality.util";
import { getCachedMapSnapshot } from "@/lib/live/branch-map-snapshot-cache";
import { getDashboardMapData } from "@/lib/queries/dashboard/dashboard-map-data.query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get("branchId"));

    const data = await getCachedMapSnapshot(branchId, () => getDashboardMapData(branchId));
    return NextResponse.json(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
