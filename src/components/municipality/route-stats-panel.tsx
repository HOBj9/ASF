"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useLabels } from "@/hooks/use-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportExcelDialog, type ExportColumn } from "@/components/municipality/export-excel-dialog";
import { Loading } from "@/components/ui/loading";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type RouteVisitPoint, type VisitOrderAnalysis } from "./route-visits-map";

const RouteVisitsMap = dynamic(
  () => import("./route-visits-map").then((m) => m.RouteVisitsMap),
  { ssr: false }
);

type WorkDayStats = {
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

type StatsResponse = {
  workDays: WorkDayStats[];
  totalWorkDays: number;
  route: {
    _id: string;
    name: string;
    color?: string;
    workScheduleId: string | null;
    pointsCount: number;
    points?: Array<{ pointId: string; order: number; name?: string; nameAr?: string; lat: number; lng: number }>;
  };
};

type DayDetailResponse = {
  visits: Array<{
    _id: string;
    pointId: string;
    vehicleId: string;
    entryTime: string;
    exitTime?: string;
    durationSeconds?: number;
  }>;
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

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailResponse | null>(null);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);

  const loadVehicles = useCallback(async () => {
    if (!branchId) return;
    setLoadingVehicles(true);
    try {
      const res: any = await apiClient.get(`/vehicles?branchId=${encodeURIComponent(branchId)}`);
      const list = (res.vehicles || res.data?.vehicles || []).filter(
        (v: VehicleItem) => v.routeId === routeId
      );
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

  const toggleExpand = (dateStr: string) => {
    if (expandedDate === dateStr) {
      setExpandedDate(null);
      setDayDetail(null);
      return;
    }
    setExpandedDate(dateStr);
    loadDayDetail(dateStr);
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

  const exportColumns: ExportColumn<WorkDayStats>[] = [
    { key: "dateStr", label: "التاريخ", value: (r) => r.dateStr },
    { key: "dayNameAr", label: "اليوم", value: (r) => r.dayNameAr },
    { key: "visitedCount", label: "النقاط المزارة", value: (r) => r.visitedCount },
    { key: "totalCount", label: "إجمالي النقاط", value: (r) => r.totalCount },
    { key: "completionRate", label: "نسبة الإنجاز %", value: (r) => r.completionRate },
  ];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات المسار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.vehicleLabel || "المركبة"}</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="كل المركبات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المركبات</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadStats} disabled={loadingStats}>
                عرض
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingStats && (
        <div className="flex justify-center py-8">
          <Loading text="جاري تحميل الإحصائيات..." className="min-h-0" />
        </div>
      )}

      {!loadingStats && stats && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>سجل أيام العمل</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  نسبة الإتمام: {completionRate}%
                </span>
                <ExportExcelDialog
                  title="تصدير سجل الزيارات"
                  rows={stats.workDays}
                  columns={exportColumns}
                  fileBaseName={`route-stats-${routeName}`}
                  buttonLabel="تصدير Excel"
                />
              </div>
            </CardHeader>
            <CardContent>
              {stats.workDays.length === 0 ? (
                <p className="text-muted-foreground py-4">لا توجد أيام عمل في الفترة المحددة.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2 px-2 w-8"></th>
                        <th className="text-right py-2 px-2">التاريخ</th>
                        <th className="text-right py-2 px-2">اليوم</th>
                        <th className="text-right py-2 px-2">النقاط المزارة</th>
                        <th className="text-right py-2 px-2">نسبة الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.workDays.map((wd) => (
                        <>
                          <tr
                            key={wd.dateStr}
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleExpand(wd.dateStr)}
                          >
                            <td className="py-2 px-2">
                              {expandedDate === wd.dateStr ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="py-2 px-2">{wd.dateStr}</td>
                            <td className="py-2 px-2">{wd.dayNameAr}</td>
                            <td className="py-2 px-2">
                              {wd.visitedCount} / {wd.totalCount}
                            </td>
                            <td className="py-2 px-2">
                              <span
                                className={
                                  wd.completionRate === 100
                                    ? "text-green-600 font-medium"
                                    : wd.completionRate >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                                }
                              >
                                {wd.completionRate}%
                              </span>
                            </td>
                          </tr>
                          {expandedDate === wd.dateStr && (
                            <tr key={`${wd.dateStr}-detail`}>
                              <td colSpan={5} className="p-4 bg-muted/30">
                                {loadingDayDetail ? (
                                  <Loading text="جاري تحميل التفاصيل..." className="min-h-0" />
                                ) : (
                                  <div className="space-y-4">
                                    {dayDetail && (
                                      <>
                                        <div>
                                          <h4 className="font-medium mb-2">تقرير الزيارة</h4>
                                          {dayDetail.visits.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">
                                              لا توجد زيارات مسجلة.
                                            </p>
                                          ) : (
                                            <div className="overflow-x-auto max-h-48">
                                              <table className="w-full text-sm">
                                                <thead>
                                                  <tr className="border-b">
                                                    <th className="text-right py-1 px-2">وقت الدخول</th>
                                                    <th className="text-right py-1 px-2">وقت الخروج</th>
                                                    <th className="text-right py-1 px-2">المدة</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {dayDetail.visits.map((v) => (
                                                    <tr key={v._id} className="border-b">
                                                      <td className="py-1 px-2">
                                                        {new Date(v.entryTime).toLocaleString("ar-SY")}
                                                      </td>
                                                      <td className="py-1 px-2">
                                                        {v.exitTime
                                                          ? new Date(v.exitTime).toLocaleString("ar-SY")
                                                          : "—"}
                                                      </td>
                                                      <td className="py-1 px-2">
                                                        {v.durationSeconds != null
                                                          ? `${v.durationSeconds} ث`
                                                          : "—"}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                        {orderAnalysis && (
                                          <div>
                                            <h4 className="font-medium mb-2">تحليل الترتيب</h4>
                                            <p
                                              className={
                                                orderAnalysis.inOrder
                                                  ? "text-green-600"
                                                  : "text-amber-600"
                                              }
                                            >
                                              {orderAnalysis.inOrder
                                                ? "الزيارة تمت بالترتيب الصحيح"
                                                : `عشوائية – النقاط الشاذة: ${orderAnalysis.outOfOrderPoints.join(", ")}`}
                                            </p>
                                          </div>
                                        )}
                                        <div>
                                          <h4 className="font-medium mb-2">خريطة النقاط</h4>
                                          <RouteVisitsMap
                                            points={mapPoints}
                                            visitedPointIds={visitedPointIds}
                                            orderAnalysis={orderAnalysis}
                                            routeColor={routeColor || stats?.route?.color || "#16a34a"}
                                            pointLabel={labels.pointLabel || "نقطة"}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </Button>
                  <span className="text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
