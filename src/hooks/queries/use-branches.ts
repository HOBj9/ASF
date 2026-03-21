"use client";

import { useQuery } from "@tanstack/react-query";

/** Server resolves org from session when `organizationId` is null (no query param). */
export function branchesQueryKey(organizationId: string | null) {
  return ["branches", organizationId ?? "__session__"] as const;
}

export type BranchListItem = {
  _id: string;
  name: string;
  nameAr?: string;
  organizationId?: string;
  fuelPricePerKmGasoline?: number | null;
  fuelPricePerKmDiesel?: number | null;
  [key: string]: unknown;
};

async function fetchBranchesList(organizationId: string | null): Promise<BranchListItem[]> {
  const url = organizationId
    ? `/api/branches?organizationId=${encodeURIComponent(organizationId)}`
    : "/api/branches";
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const list = data.branches ?? data.data?.branches ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((b: Record<string, unknown>) => ({
    ...b,
    _id: String(b._id),
  })) as BranchListItem[];
}

export type UseBranchesOptions = {
  /** When set (e.g. super admin), requests `/api/branches?organizationId=`. When null, uses session org. */
  organizationId: string | null;
  enabled?: boolean;
};

export function useBranches(options: UseBranchesOptions) {
  const { organizationId, enabled = true } = options;
  return useQuery({
    queryKey: branchesQueryKey(organizationId),
    queryFn: () => fetchBranchesList(organizationId),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
