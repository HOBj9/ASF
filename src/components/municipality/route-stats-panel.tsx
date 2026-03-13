"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useLabels } from "@/hooks/use-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { type RouteVisitPoint, type VisitOrderAnalysis } from "./route-visits-map";
import { getRouteStatsExportColumns, type WorkDayStats } from "./route-stats-export-columns";
import { RouteStatsPanelContent } from "./route-stats-panel-content";

type PathGeometry = { type: "LineString"; coordinates: number[][] };

type StatsResponse = {
  workDays: WorkDayStats[];
  totalWorkDays: number;
  route: {
    _id: string;
    name: string;
    color?: string;
    workScheduleId: string | null;
    pointsCount: number;
    path?: PathGeometry | null;
    points?: { pointId: string; order: number; name?: string; nameAr?: string; lat: number; lng: number }[];
  };
};

type DayDetailItem = {
  _id: string;
  pointId: string;
  vehicleId: string;
  entryTime: string;
  exitTime?: string;
  durationSeconds?: number;
};
type DayDetailResponse = {
  visits: DayDetailItem[];
  visitedPointIds: string[];
  orderAnalysis: VisitOrderAnalysis | null;
};

type VehicleItem = { _id: string; name: string; routeId?: string };

const PAGE_SIZE = 30;

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(now);
  return { from: toDateInput(start), to: toDateInput(end) };
}

export function RouteStatsPanel({
  routeId,
  branchId,
  routeName,
  routeColor,
  onLinkWorkSchedule,
}: {
  routeId: string;
  branchId: string;
  routeName: string;
  routeColor?: string;
  onLinkWorkSchedule?: () => void;
}) {
  const { labels } = useLabels();
  const defaultRange = useMemo(() => getDefaultRange(), []);

  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [page, setPage] = useState(1);

  const [detailDateStr, setDetailDateStr] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailResponse | null>(null);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);

  const loadVehicles = useCallback(async () => {
    if (!branchId) return;
    setLoadingVehicles(true);
    try {
      const res: any = await apiClient.get(`/vehicles?branchId=${encodeURIComponent(branchId)}`);
      const all = res.vehicles || res.data?.vehicles || [];
      const list = all.filter(
        (v: VehicleItem) => String((v as any).routeId || "") === String(routeId)
      ).map((v: VehicleItem) => ({ _id: (v as any)._id, name: (v as any).name || "" }));
      setVehicles(list);
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [branchId, routeId]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const loadStats = useCallback(async () => {
    if (!routeId || !branchId) return;
    setLoadingStats(true);
    setStats(null);
    try {
      const params = new URLSearchParams();
      params.set("branchId", branchId);
      params.set("from", fromDate);
      params.set("to", toDate);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (vehicleId && vehicleId !== "all") params.set("vehicleId", vehicleId);

      const res: StatsResponse = await apiClient.get(`/routes/${routeId}/stats?${params}`);

      setStats(res);
    } catch (err) {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [routeId, branchId, fromDate, toDate, vehicleId, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const loadDayDetail = useCallback(
    async (dateStr: string) => {
      if (!routeId || !branchId) return;
      setLoadingDayDetail(true);
      setDayDetail(null);
      try {
        const params = new URLSearchParams();
        params.set("branchId", branchId);
        params.set("date", dateStr);
        if (vehicleId && vehicleId !== "all") params.set("vehicleId", vehicleId);

        const res: DayDetailResponse = await apiClient.get(`/routes/${routeId}/stats/day?${params}`);
        setDayDetail(res);
      } catch {
        setDayDetail(null);
      } finally {
        setLoadingDayDetail(false);
      }
    },
    [routeId, branchId, vehicleId]
  );

  const openDetailModal = (dateStr: string) => {
    setDetailDateStr(dateStr);
    loadDayDetail(dateStr);
  };

  const closeDetailModal = () => {
    setDetailDateStr(null);
    setDayDetail(null);
  };

  const totalPages = Math.ceil((stats?.totalWorkDays ?? 0) / PAGE_SIZE);
  const completionRate = useMemo(() => {
    if (!stats?.workDays?.length) return 0;
    const full = stats.workDays.filter((w) => w.completionRate === 100).length;
    return Math.round((full / stats.totalWorkDays) * 100);
  }, [stats]);

  const mapPoints: RouteVisitPoint[] = useMemo(() => {
    const pts = stats?.route?.points ?? [];
    return pts.map((p) => ({
      pointId: p.pointId,
      lat: p.lat,
      lng: p.lng,
      order: p.order,
      name: p.name,
      nameAr: p.nameAr,
    }));
  }, [stats?.route?.points]);

  const visitedPointIds = dayDetail?.visitedPointIds ?? [];
  const orderAnalysis = dayDetail?.orderAnalysis ?? null;

  const exportColumns = getRouteStatsExportColumns();

  const todayDateStr = useMemo(() => toDateInput(new Date()), []);

  if (loadingStats && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات المسار</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loading text="جاري تحميل الإحصائيات..." className="min-h-0" />
        </CardContent>
      </Card>
    );
  }

  if (!stats?.route?.workScheduleId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات المسار</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            يرجى ربط المسار بجدول أيام عمل أولاً لعرض الإحصائيات.
          </p>
          {onLinkWorkSchedule && (
            <Button onClick={onLinkWorkSchedule}>ربط الآن</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (stats?.route?.pointsCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات المسار</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">أضف نقاطاً للمسار أولاً لعرض الإحصائيات.</p>
        </CardContent>
      </Card>
    );
  }

  return React.createElement(RouteStatsPanelContent, {
    loadingStats,
    stats,
    completionRate,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    vehicleId,
    setVehicleId,
    vehicles,
    loadStats,
    exportColumns,
    routeName,
    todayDateStr,
    openDetailModal,
    detailDateStr,
    closeDetailModal,
    loadingDayDetail,
    dayDetail,
    orderAnalysis,
    mapPoints,
    visitedPointIds,
    routeColor: routeColor ?? undefined,
    labels,
    totalPages,
    page,
    setPage,
  });
}
