"use client";

import { useQuery } from "@tanstack/react-query";

export const ORGANIZATIONS_QUERY_KEY = ["organizations"] as const;

export type OrganizationSummary = {
  _id: string;
  name: string;
  slug?: string;
  type?: string;
  labels?: Record<string, string>;
  isActive?: boolean;
};

async function fetchOrganizations(): Promise<OrganizationSummary[]> {
  const res = await fetch("/api/organizations");
  if (!res.ok) return [];
  const data = await res.json();
  const list = data.organizations ?? data.data?.organizations ?? [];
  return Array.isArray(list) ? list : [];
}

export function useOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: ORGANIZATIONS_QUERY_KEY,
    queryFn: fetchOrganizations,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
