export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { resolveBranchId } from "@/lib/utils/municipality.util";
import { getDashboardOverview } from "@/lib/queries/dashboard/dashboard-overview.query";
import { isAdmin, isOrganizationAdmin } from "@/lib/permissions";

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const num = Math.floor(parsed);
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get("branchId");
    const role = session?.user?.role;
    const sessionBranchId = (session?.user as any)?.branchId || null;
    const branchId =
      branchParam || sessionBranchId || (!isAdmin(role) && !isOrganizationAdmin(role))
        ? resolveBranchId(session, branchParam)
        : null;
    const dailyDays = parsePositiveInt(searchParams.get("dailyDays"), 14, 7, 60);
    const monthlyMonths = parsePositiveInt(searchParams.get("monthlyMonths"), 12, 3, 24);

    const overview = await getDashboardOverview(session, {
      branchId,
      dailyDays,
      monthlyMonths,
      eventsLimit: 10,
    });

    return NextResponse.json(overview);
  } catch (error: any) {
    return handleApiError(error);
  }
}
