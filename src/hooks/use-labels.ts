import { useEffect, useState } from 'react';
import { defaultLabels, sanitizeLabels } from '@/lib/utils/labels.util';

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

export function useLabels() {
  const [labels, setLabels] = useState<Labels>(defaultLabels);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/labels')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.labels) {
          setLabels(sanitizeLabels(data.labels));
        }
        const name = data.organizationName;
        setOrganizationName(name && !/^[\s?]+$/.test(String(name).trim()) ? name : 'المؤسسة');
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { labels, organizationName, loading };
}

