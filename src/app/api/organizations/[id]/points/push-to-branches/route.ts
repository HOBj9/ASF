export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { permissionActions, permissionResources } from "@/constants/permissions";
import { resolveOrganizationId } from "@/lib/utils/organization.util";
import { PointService } from "@/lib/services/point.service";

const pointService = new PointService();

/**
 * POST /api/organizations/:id/points/push-to-branches
 * نسخ نقطة مستوى مؤسسة إلى جميع فروع المؤسسة النشطة.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json().catch(() => ({}));
    const pointId = body?.pointId as string | undefined;
    if (!pointId || String(pointId).trim() === "") {
      return NextResponse.json({ error: "معرّف النقطة مطلوب" }, { status: 400 });
    }

    const pushed = await pointService.pushPointToAllBranches(organizationId, String(pointId).trim());
    return NextResponse.json({
      pushed,
      message: pushed > 0 ? `تم النسخ إلى ${pushed} فرع` : "لا توجد فروع جديدة للنسخ",
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
