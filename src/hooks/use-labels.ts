import { useEffect, useState } from 'react';

export type Labels = {
  branchLabel: string;
  pointLabel: string;
  vehicleLabel: string;
  driverLabel: string;
  routeLabel: string;
};

const defaultLabels: Labels = {
  branchLabel: 'فرع',
  pointLabel: 'نقاط',
  vehicleLabel: 'مركبات',
  driverLabel: 'سائقين',
  routeLabel: 'مسارات',
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
          setLabels({ ...defaultLabels, ...data.labels });
        }
        if (data.organizationName) {
          setOrganizationName(data.organizationName);
        }
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

