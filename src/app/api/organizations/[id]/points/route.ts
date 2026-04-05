export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { permissionActions, permissionResources } from "@/constants/permissions";
import { resolveOrganizationId } from "@/lib/utils/organization.util";
import connectDB from "@/lib/mongodb";
import Point from "@/models/Point";
import Branch from "@/models/Branch";

/**
 * GET /api/organizations/:id/points
 * - بدون query: نقاط على مستوى المؤسسة (branchId فارغ).
 * - ?scope=branches: نقاط فروع المؤسسة النشطة.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    await connectDB();

    if (scope === "branches") {
      const branches = await Branch.find({ organizationId, isActive: true }).select("_id").lean().exec();
      const branchIds = branches.map((b) => b._id);
      if (branchIds.length === 0) {
        return NextResponse.json({ points: [] });
      }
      const points = await Point.find({ branchId: { $in: branchIds } })
        .populate("branchId", "name nameAr")
        .populate("createdByUserId", "name email")
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
      return NextResponse.json({ points });
    }

    const points = await Point.find({ organizationId, branchId: null })
      .populate("createdByUserId", "name email")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ points });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
