import { useEffect, useState } from "react";
import { defaultLabels, sanitizeLabels } from "@/lib/utils/labels.util";

export type Labels = {
  branchLabel: string;
  pointLabel: string;
  vehicleLabel: string;
  driverLabel: string;
  routeLabel: string;
  lineSupervisorLabel: string;
  surveyLabel: string;
  eventsReportLabel: string;
  latestEventsLabel: string;
};

export function useLabels(initialData?: { labels?: Labels; organizationName?: string }) {
  const [labels, setLabels] = useState<Labels>(initialData?.labels || defaultLabels);
  const [organizationName, setOrganizationName] = useState<string>(initialData?.organizationName || "");
  const [loading, setLoading] = useState<boolean>(!initialData);

  useEffect(() => {
    if (initialData?.labels) {
      setLabels(sanitizeLabels(initialData.labels));
      setOrganizationName(initialData.organizationName || "");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch("/api/labels")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;

        if (data.labels) {
          setLabels(sanitizeLabels(data.labels));
        }

        const name = data.organizationName;
        setOrganizationName(name && !/^[\s?]+$/.test(String(name).trim()) ? name : "المؤسسة");
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialData?.labels, initialData?.organizationName]);

  return { labels, organizationName, loading };
}
