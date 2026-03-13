import type { ExportColumn } from "@/components/municipality/export-excel-dialog";

export type WorkDayStats = {
  date: string;
  dateStr: string;
  dayOfWeek: number;
  dayNameAr: string;
  startTime: string;
  endTime: string;
  visitedCount: number;
  totalCount: number;
  completionRate: number;
};

export function getRouteStatsExportColumns(): ExportColumn<WorkDayStats>[] {
  return [
    { key: "dateStr", label: "التاريخ", value: (r) => r.dateStr },
    { key: "dayNameAr", label: "اليوم", value: (r) => r.dayNameAr },
    { key: "visitedCount", label: "النقاط المزارة", value: (r) => r.visitedCount },
    { key: "totalCount", label: "إجمالي النقاط", value: (r) => r.totalCount },
    { key: "completionRate", label: "نسبة الإنجاز %", value: (r) => r.completionRate },
  ];
}
