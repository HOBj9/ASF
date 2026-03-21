"use client";

import { useQuery } from "@tanstack/react-query";

type BranchSummary = {
  _id: string;
  name?: string;
  nameAr?: string;
};

async function fetchBranches(): Promise<BranchSummary[]> {
  const res = await fetch("/api/branches");
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.branches ?? []).map((b: any) => ({
    _id: String(b._id),
    name: b.name,
    nameAr: b.nameAr,
  }));
}

export function useBranches(enabled = true) {
  return useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled,
    staleTime: 5 * 60 * 1000, // branches rarely change
  });
}
