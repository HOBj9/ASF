"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardOverviewData } from "@/lib/contracts/dashboard";

type OverviewParams = {
  dailyDays: number;
  monthlyMonths: number;
  branchId?: string;
  enabled?: boolean;
};

async function fetchOverview(params: OverviewParams): Promise<DashboardOverviewData> {
  const searchParams = new URLSearchParams({
    dailyDays: String(params.dailyDays),
    monthlyMonths: String(params.monthlyMonths),
  });
  if (params.branchId) searchParams.set("branchId", params.branchId);

  const res = await fetch(`/api/dashboard/overview?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

export function useDashboardOverview(
  params: OverviewParams,
  initialData?: DashboardOverviewData | null,
) {
  return useQuery({
    queryKey: ["dashboard-overview", params.dailyDays, params.monthlyMonths, params.branchId],
    queryFn: () => fetchOverview(params),
    enabled: params.enabled !== false,
    initialData: initialData ?? undefined,
    staleTime: 30 * 1000,
    refetchInterval: params.enabled !== false ? 30_000 : false,
  });
}
