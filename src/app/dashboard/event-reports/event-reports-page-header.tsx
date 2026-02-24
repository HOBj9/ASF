'use client';

import { useLabels } from '@/hooks/use-labels';

export function EventReportsPageHeader() {
  const { labels } = useLabels();
  const title = labels.eventsReportLabel || 'تقارير الأحداث';

  return (
    <div className="mb-6 lg:mb-8">
      <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">
        تقارير مخصصة لمسار المركبات على النقاط وتقارير حركة المركبات داخل كل نقطة.
      </p>
    </div>
  );
}
