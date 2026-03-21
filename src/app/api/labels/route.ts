export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { withCache } from "@/lib/utils/cache-headers.util";
import { resolveOrganizationId } from "@/lib/utils/organization.util";
import { defaultLabels, sanitizeLabels } from "@/lib/utils/labels.util";
import Organization from "@/models/Organization";
import Branch from "@/models/Branch";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);
    const organization = await Organization.findById(organizationId).select("labels name").lean();

    if (!organization) {
      return NextResponse.json({ error: "المؤسسة غير موجودة" }, { status: 404 });
    }

    let merged = { ...defaultLabels, ...(organization.labels || {}) };
    const branchId = (session?.user as any)?.branchId;
    if (branchId) {
      const branch = await Branch.findById(branchId).select("labels").lean();
      if (branch?.labels && typeof branch.labels === "object") {
        merged = { ...merged, ...branch.labels };
      }
    }

    const labels = sanitizeLabels(merged);
    const organizationName =
      organization.name && !/^[\s?]+$/.test(String(organization.name).trim())
        ? organization.name
        : "المؤسسة";

    return withCache(NextResponse.json({ labels, organizationName }), 300);
  } catch (error: any) {
    return handleApiError(error);
  }
}
