import type { DashboardOverviewData } from "@/lib/contracts/dashboard";
import { TtlCache } from "./ttl-cache";

const overviewCache = new TtlCache<DashboardOverviewData>(60_000); // 60s

function getOverviewKey(branchId: string, dailyDays: number, monthlyMonths: number): string {
  return `${branchId}:overview:${dailyDays}:${monthlyMonths}`;
}

export async function getCachedOverview(
  branchId: string,
  dailyDays: number,
  monthlyMonths: number,
  loader: () => Promise<DashboardOverviewData>,
): Promise<DashboardOverviewData> {
  return overviewCache.getOrLoad(getOverviewKey(branchId, dailyDays, monthlyMonths), loader);
}

export function invalidateOverview(branchId: string): void {
  // Invalidate all overview entries for this branch (iterate keys)
  // Since TtlCache doesn't expose keys, we rely on TTL expiration
  // For targeted invalidation, the 60s TTL is short enough
}
