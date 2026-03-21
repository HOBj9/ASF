"use client";

import React from "react";
import { type ExportColumn } from "@/components/municipality/export-excel-dialog";
import { type RouteVisitPoint, type VisitOrderAnalysis } from "./route-visits-map";
import type { WorkDayStats } from "./route-stats-export-columns";
import { RouteStatsPanelContentBody } from "./route-stats-panel-content-body";

type PathGeometry = { type: "LineString"; coordinates: number[][] };

export type RouteStatsPanelContentProps = {
  loadingStats: boolean;
  stats: {
    workDays: WorkDayStats[];
    totalWorkDays: number;
    route?: { color?: string; path?: PathGeometry | null };
  } | null;
  completionRate: number;
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  vehicleId: string;
  setVehicleId: (v: string) => void;
  vehicles: { _id: string; name: string }[];
  loadStats: () => void;
  exportColumns: ExportColumn<WorkDayStats>[];
  routeName: string;
  todayDateStr: string;
  openDetailModal: (dateStr: string) => void;
  detailDateStr: string | null;
  closeDetailModal: () => void;
  loadingDayDetail: boolean;
  dayDetail: {
    visits: Array<{ _id: string; entryTime: string; exitTime?: string; durationSeconds?: number; withinWorkHours?: boolean }>;
    visitedPointIds: string[];
    orderAnalysis: VisitOrderAnalysis | null;
  } | null;
  orderAnalysis: VisitOrderAnalysis | null;
  mapPoints: RouteVisitPoint[];
  visitedPointIds: string[];
  routeColor?: string;
  labels: { vehicleLabel?: string; pointLabel?: string };
  totalPages: number;
  page: number;
  setPage: (updater: (p: number) => number) => void;
};

export function RouteStatsPanelContent(props: RouteStatsPanelContentProps) {
  return React.createElement(RouteStatsPanelContentBody, props);
}
