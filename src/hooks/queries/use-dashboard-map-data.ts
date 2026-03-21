"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardMapData } from "@/lib/contracts/dashboard";

async function fetchMapData(branchId?: string): Promise<DashboardMapData> {
  const url = branchId
    ? `/api/dashboard/map-data?branchId=${encodeURIComponent(branchId)}`
    : "/api/dashboard/map-data";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch map data");
  return res.json();
}

export function useDashboardMapData(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: ["dashboard-map-data", branchId],
    queryFn: () => fetchMapData(branchId),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
