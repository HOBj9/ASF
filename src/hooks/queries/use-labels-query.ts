"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { defaultLabels, sanitizeLabels, type Labels } from "@/lib/utils/labels.util";

export const LABELS_STALE_MS = 30 * 60 * 1000;

export type LabelsQueryData = {
  labels: Labels;
  organizationName: string;
};

export function labelsQueryKey(organizationId: string, branchId: string) {
  return ["labels", organizationId, branchId] as const;
}

function normalizeOrganizationName(name: string | undefined): string {
  if (name && !/^[\s?]+$/.test(String(name).trim())) {
    return name;
  }
  return "المؤسسة";
}

async function fetchLabels(): Promise<LabelsQueryData> {
  const res = await fetch("/api/labels");
  if (!res.ok) {
    return {
      labels: defaultLabels,
      organizationName: "المؤسسة",
    };
  }
  const data = await res.json();
  return {
    labels: sanitizeLabels(data.labels),
    organizationName: normalizeOrganizationName(data.organizationName),
  };
}

export type UseLabelsQueryOptions = {
  /** Server-provided snapshot (e.g. dashboard overview) to seed cache without an immediate refetch */
  initialSnapshot?: { labels: Labels; organizationName?: string };
};

export function useLabelsQuery(options?: UseLabelsQueryOptions): UseQueryResult<LabelsQueryData, Error> {
  const { data: session, status } = useSession();
  const user = session?.user as { organizationId?: string; branchId?: string } | undefined;
  const organizationId = user?.organizationId ?? "";
  const branchId = user?.branchId ?? "";

  const snap = options?.initialSnapshot;
  const hasSnapshot = Boolean(snap?.labels);

  return useQuery({
    queryKey: labelsQueryKey(organizationId, branchId),
    queryFn: fetchLabels,
    enabled: status === "authenticated",
    staleTime: LABELS_STALE_MS,
    gcTime: 60 * 60 * 1000,
    ...(hasSnapshot && snap
      ? {
          initialData: {
            labels: sanitizeLabels(snap.labels),
            organizationName: normalizeOrganizationName(snap.organizationName),
          },
          initialDataUpdatedAt: Date.now(),
        }
      : {}),
  });
}
