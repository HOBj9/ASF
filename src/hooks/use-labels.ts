"use client";

import { defaultLabels, sanitizeLabels, type Labels } from "@/lib/utils/labels.util";
import { useLabelsQuery } from "@/hooks/queries/use-labels-query";

export type { Labels };

function snapshotFromInitial(initialData: { labels: Labels; organizationName?: string }) {
  return {
    labels: sanitizeLabels(initialData.labels),
    organizationName:
      initialData.organizationName && !/^[\s?]+$/.test(String(initialData.organizationName).trim())
        ? initialData.organizationName
        : "المؤسسة",
  };
}

export function useLabels(initialData?: { labels?: Labels; organizationName?: string }) {
  const hasServerLabels = Boolean(initialData?.labels);
  const query = useLabelsQuery(
    hasServerLabels && initialData?.labels
      ? {
          initialSnapshot: {
            labels: initialData.labels,
            organizationName: initialData.organizationName,
          },
        }
      : undefined,
  );

  if (hasServerLabels && initialData?.labels && !query.data) {
    const snap = snapshotFromInitial(initialData as { labels: Labels; organizationName?: string });
    return {
      labels: snap.labels,
      organizationName: snap.organizationName,
      loading: query.isPending && query.fetchStatus === "fetching",
    };
  }

  return {
    labels: query.data?.labels ?? defaultLabels,
    organizationName: query.data?.organizationName ?? "",
    loading: query.isPending && !query.data,
  };
}
