export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { permissionActions, permissionResources } from "@/constants/permissions";
import { resolveOrganizationId } from "@/lib/utils/organization.util";
import connectDB from "@/lib/mongodb";
import Point from "@/models/Point";
import Branch from "@/models/Branch";
import { AtharService } from "@/lib/services/athar.service";

type TransferResult = { pointId: string; branchId?: string; zoneId?: string; error?: string };

/**
 * POST /api/organizations/:id/points/transfer-to-athar
 * إنشاء مناطق في أثر لنقاط الفروع التي لا تحمل zoneId بعد.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINTS,
      permissionActions.TRANSFER_TO_ATHAR,
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json().catch(() => ({}));
    const pointIdsRaw = body?.pointIds as string[] | undefined;
    const pointIdSet =
      Array.isArray(pointIdsRaw) && pointIdsRaw.length > 0
        ? new Set(pointIdsRaw.map((id) => String(id).trim()).filter(Boolean))
        : null;

    await connectDB();

    const branchesWithAthar = await Branch.find({
      organizationId,
      isActive: true,
      atharKey: { $exists: true, $type: "string", $ne: "" },
    })
      .select("_id")
      .lean()
      .exec();

    const branchIds = branchesWithAthar.map((b) => b._id);

    if (branchIds.length === 0) {
      return NextResponse.json({
        results: [] as TransferResult[],
        message: "لا توجد فروع بمفتاح أثر مفعّل",
      });
    }

    const baseQuery: Record<string, unknown> = {
      branchId: { $in: branchIds },
      $or: [{ zoneId: null }, { zoneId: "" }],
    };

    if (pointIdSet) {
      baseQuery._id = { $in: Array.from(pointIdSet) };
    }

    const branchPoints = await Point.find(baseQuery).lean().exec();

    const results: TransferResult[] = [];
    const radiusMeters = 500;

    for (const branchPoint of branchPoints) {
      const bpId = String(branchPoint._id);
      const branchId = branchPoint.branchId ? String(branchPoint.branchId) : "";
      if (!branchId) {
        results.push({ pointId: bpId, error: "النقطة بلا فرع" });
        continue;
      }
      if (branchPoint.zoneId) {
        continue;
      }

      const orgPointName =
        (branchPoint as { nameAr?: string; name?: string }).nameAr ||
        (branchPoint as { name?: string }).name ||
        "نقطة";

      try {
        const atharService = await AtharService.forBranch(branchId);
        const zoneId = await atharService.createZone(
          orgPointName,
          { lat: branchPoint.lat, lng: branchPoint.lng },
          (branchPoint as { radiusMeters?: number }).radiusMeters ?? radiusMeters,
        );
        if (zoneId) {
          await Point.findByIdAndUpdate(branchPoint._id, { zoneId });
          results.push({ pointId: bpId, branchId, zoneId });
        } else {
          results.push({ pointId: bpId, branchId, error: "لم يُرجع أثر معرّف منطقة" });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "فشل إنشاء المنطقة في أثر";
        results.push({ pointId: bpId, branchId, error: message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
