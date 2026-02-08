"use client";

import { useEffect, useState } from "react";
import { MunicipalityMap, type MapTab } from "./municipality-map";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useLabels } from "@/hooks/use-labels";

type BranchInfo = {
  _id: string;
  name: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone: string;
};

type Point = {
  _id: string;
  name: string;
  nameAr?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: string;
};

type LiveVehicle = {
  id: string;
  busNumber: string;
  driverName: string;
  status: "moving" | "stopped" | "offline";
  lastUpdate: string;
  speed: number;
  heading: number;
  coordinates: [number, number] | null;
  imei?: string;
};

type AtharZone = {
  id: string;
  name: string;
  color?: string;
  center: { lat: number; lng: number } | null;
  vertices: Array<{ lat: number; lng: number }>;
};

type AtharObject = {
  id: string;
  imei: string;
  name: string;
  plateNumber: string | null;
  lat: number | null;
  lng: number | null;
  speed: number;
  angle: number;
  active: boolean;
  dtTracker: string | null;
  dtServer: string | null;
  model: string | null;
  device: string | null;
  raw: Record<string, any>;
};

type VehicleSummary = {
  _id: string;
  name: string;
  plateNumber?: string | null;
  imei?: string;
  atharObjectId?: string | null;
  routeId?: string | null;
  isActive?: boolean;
};

type Route = {
  _id: string;
  name: string;
  path?: {
    type: "LineString";
    coordinates: number[][];
  };
};

type Stats = {
  activeVehicles: number;
  activePoints: number;
  dailyCompletionPercent: number;
  totalPoints: number;
  visitedPointsToday: number;
};

type Analytics = {
  daily: Array<{ date: string; containers: number; events: number; avgMinutes: number }>;
  monthly: Array<{ month: string; containers: number }>;
  vehicleStatus?: { active: number; inactive: number };
  pointTypes?: Array<{ type: string; label: string; count: number }>;
  eventsByType?: Record<string, number>;
};

type EventItem = {
  _id: string;
  type: string;
  name?: string;
  imei?: string;
  eventTimestamp?: string;
  pointName?: string;
  vehicleName?: string;
  driverName?: string;
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "sky" | "amber" | "violet";
}) {
  const toneClasses: Record<string, string> = {
    emerald: "from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-200 border-emerald-500/30",
    sky: "from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-200 border-cyan-500/30",
    amber: "from-amber-500/20 via-amber-500/10 to-transparent text-amber-200 border-amber-500/30",
    violet: "from-lime-500/20 via-lime-500/10 to-transparent text-lime-200 border-lime-500/30",
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${toneClasses[tone]} p-4 text-right shadow-sm backdrop-blur-sm`}>
      <div className="text-sm text-foreground/75">{label}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

export function MunicipalityDashboard() {
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const [atharObjects, setAtharObjects] = useState<AtharObject[]>([]);
  const [zones, setZones] = useState<AtharZone[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMapTab, setActiveMapTab] = useState<MapTab>("live");
  const [showEvents, setShowEvents] = useState(true);
  const [dailyDays, setDailyDays] = useState<7 | 14 | 30>(14);
  const [monthlyMonths, setMonthlyMonths] = useState<6 | 12>(12);
  const [pointsLoaded, setPointsLoaded] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [objectsLoaded, setObjectsLoaded] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const { labels } = useLabels();

  const chartPalette = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#facc15", "#14b8a6"];
  const mapTabLoading: Partial<Record<MapTab, boolean>> = {
    live: activeMapTab === "live" && !liveLoaded,
    points: activeMapTab === "points" && !pointsLoaded,
    zones: activeMapTab === "zones" && !zonesLoaded,
    objects: activeMapTab === "objects" && !objectsLoaded,
  };

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const [branchRes, routesRes, statsRes, eventsRes, analyticsRes] =
          await Promise.all([
            fetch("/api/municipality"),
            fetch("/api/routes"),
            fetch("/api/dashboard/stats"),
            fetch("/api/events?limit=8"),
            fetch(`/api/dashboard/analytics?dailyDays=${dailyDays}&monthlyMonths=${monthlyMonths}`),
          ]);

        if (!active) return;

        if (branchRes.ok) {
          const data = await branchRes.json();
          setBranch(data.branch || data.municipality || null);
        }
        if (routesRes.ok) {
          const data = await routesRes.json();
          setRoutes(data.routes || []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data.events || []);
        }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitial();
    const interval = setInterval(() => {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => null);
      fetch("/api/events?limit=8")
        .then((res) => res.json())
        .then((data) => setEvents(data.events || []))
        .catch(() => null);
      fetch(`/api/dashboard/analytics?dailyDays=${dailyDays}&monthlyMonths=${monthlyMonths}`)
        .then((res) => res.json())
        .then((data) => setAnalytics(data))
        .catch(() => null);
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dailyDays, monthlyMonths]);

  function exportChartAsPng(containerId: string, filename: string) {
    const container = document.getElementById(containerId);
    const svg = container?.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width || 1400;
      canvas.height = image.height || 700;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${filename}.png`;
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  useEffect(() => {
    if (activeMapTab !== "live") return;
    const source = new EventSource("/api/vehicles/locations/websocket");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "bus_locations" && Array.isArray(payload?.data)) {
          setLiveVehicles(payload.data);
          setLiveLoaded(true);
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [activeMapTab]);

  useEffect(() => {
    if (activeMapTab === "live" && !liveLoaded) {
      fetch("/api/vehicles/locations")
        .then((res) => res.json())
        .then((data) => {
          setLiveVehicles(data.data || []);
          setLiveLoaded(true);
        })
        .catch(() => {
          setLiveLoaded(true);
        });
      return;
    }

    if (activeMapTab === "points" && !pointsLoaded) {
      fetch("/api/points")
        .then((res) => res.json())
        .then((data) => {
          setPoints(data.points || []);
          setPointsLoaded(true);
        })
        .catch(() => {
          setPointsLoaded(true);
        });
      return;
    }

    if (activeMapTab === "zones" && !zonesLoaded) {
      fetch("/api/athar/zones?sync=false")
        .then((res) => res.json())
        .then((data) => {
          setZones(data.zones || []);
          // keep points if returned, useful fallback
          if (Array.isArray(data.points) && data.points.length && !pointsLoaded) {
            setPoints(data.points);
            setPointsLoaded(true);
          }
          setZonesLoaded(true);
        })
        .catch(() => {
          setZonesLoaded(true);
        });
      return;
    }

    if (activeMapTab === "objects" && !objectsLoaded) {
      fetch("/api/athar/objects")
        .then((res) => res.json())
        .then((data) => {
          setAtharObjects(data.objects || []);
          setObjectsLoaded(true);
        })
        .catch(() => {
          setObjectsLoaded(true);
        });
    }

    if (activeMapTab === "objects" && !vehiclesLoaded) {
      fetch("/api/vehicles")
        .then((res) => res.json())
        .then((data) => {
          setVehicles(data.vehicles || []);
          setVehiclesLoaded(true);
        })
        .catch(() => {
          setVehiclesLoaded(true);
        });
    }
  }, [activeMapTab, liveLoaded, pointsLoaded, zonesLoaded, objectsLoaded, vehiclesLoaded]);

  const pointTypeData = analytics?.pointTypes || [];
  const vehicleStatusData = [
    { name: "مفعّلة", value: analytics?.vehicleStatus?.active || 0 },
    { name: "غير مفعّلة", value: analytics?.vehicleStatus?.inactive || 0 },
  ];
  const eventTypeData = [
    { name: "دخول", value: analytics?.eventsByType?.zone_in || 0 },
    { name: "خروج", value: analytics?.eventsByType?.zone_out || 0 },
  ];


  if (loading && !branch && !stats) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-6">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`kpi-loading-${idx}`} className="rounded-xl border bg-card p-4">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border bg-card p-4">
            <Skeleton className="h-5 w-44 mb-4" />
            <Skeleton className="h-[520px] w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`event-loading-${idx}`} className="rounded-lg border p-3">
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-cyan-900/20 p-6 shadow-sm text-right">
        <div className="text-sm text-muted-foreground">إدارة {labels.branchLabel}</div>
        <h2 className="text-2xl font-semibold mt-2">{branch?.name || "غير محدد بعد"}</h2>
        {branch?.addressText && (
          <p className="text-sm text-muted-foreground mt-1">{branch.addressText}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={`${labels.vehicleLabel} العاملة الآن`} value={stats?.activeVehicles ?? "--"} tone="emerald" />
        <StatCard label={`${labels.pointLabel} النشطة الآن`} value={stats?.activePoints ?? "--"} tone="sky" />
        <StatCard label={`${labels.pointLabel} المنجزة اليوم`} value={stats?.visitedPointsToday ?? "--"} tone="amber" />
        <StatCard label="نسبة الإنجاز اليومية" value={`${stats?.dailyCompletionPercent ?? 0}%`} tone="violet" />
      </div>

      <div className={cn("grid gap-6", showEvents ? "lg:grid-cols-[2fr_1fr]" : "lg:grid-cols-1")}>
        <div className={cn("space-y-4", loading && "opacity-70")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-right">الخريطة التشغيلية</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEvents((prev) => !prev)}
              >
                {showEvents ? "إخفاء الأحداث" : "إظهار الأحداث"}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {points.length} {labels.pointLabel} â€¢ {zones.length} مناطق â€¢ {routes.length} {labels.routeLabel} â€¢ {atharObjects.length} سيارات أثر
            </div>
          </div>
          <MunicipalityMap
            municipality={branch}
            liveVehicles={liveVehicles}
            atharObjects={atharObjects}
            vehicles={vehicles}
            routes={routes}
            zones={zones}
            points={points}
            activeTab={activeMapTab}
            onTabChange={setActiveMapTab}
            tabLoading={mapTabLoading}
          />
        </div>

        {showEvents && (
        <div className="rounded-2xl border bg-card p-4 text-right shadow-sm lg:h-[620px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">آخر الأحداث</h3>
            <span className="text-xs text-muted-foreground">آخر 8 أحداث</span>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {events.length === 0 && <div className="text-sm text-muted-foreground">لا توجد أحداث حالياً.</div>}
            {events.map((event) => (
              <div key={event._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{event.type === "zone_in" ? "دخول" : "خروج"}</span>
                  <span className="text-xs text-muted-foreground">{event.eventTimestamp || ""}</span>
                </div>
                <div className="font-semibold mt-1">
                  {event.name || event.pointName || `${labels.pointLabel} بدون اسم`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {event.vehicleName || event.imei || ""}
                </div>
                {event.driverName && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {labels.driverLabel}: {event.driverName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4 text-right shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">فلتر الرسوم البيانية</h3>
            <p className="text-xs text-muted-foreground mt-1">اختر الفترة الزمنية لتحديث الرسوم البيانية.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={dailyDays}
              onChange={(e) => setDailyDays(Number(e.target.value) as 7 | 14 | 30)}
            >
              <option value={7}>آخر 7 أيام</option>
              <option value={14}>آخر 14 يوم</option>
              <option value={30}>آخر 30 يوم</option>
            </select>
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={monthlyMonths}
              onChange={(e) => setMonthlyMonths(Number(e.target.value) as 6 | 12)}
            >
              <option value={6}>آخر 6 أشهر</option>
              <option value={12}>آخر 12 شهر</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-daily-containers", "daily-containers")}> 
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="يعرض عدد النقاط/الحاويات التي تمت زيارتها يومياً خلال الفترة الأخيرة." />
                <h3 className="text-lg font-semibold">{labels.pointLabel} المنجزة يومياً</h3>
              </div>
              <p className="text-xs text-muted-foreground">يعرض عدد النقاط/الحاويات التي تمت زيارتها يومياً خلال الفترة الأخيرة.</p>
            </div>
          </div>
          <div className="h-64" id="chart-daily-containers">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="containers" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-amber-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-daily-events", "daily-events")}>
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="يوضح إجمالي أحداث الدخول والخروج المسجلة يومياً." />
                <h3 className="text-lg font-semibold">الأحداث اليومية</h3>
              </div>
              <p className="text-xs text-muted-foreground">يوضح إجمالي أحداث الدخول والخروج المسجلة يومياً.</p>
            </div>
          </div>
          <div className="h-64" id="chart-daily-events">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="events" stroke="#8b5cf6" fill="#a78bfa" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-sky-50 p-4 shadow-sm text-right">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-monthly-containers", "monthly-containers")}>
            <Download className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center justify-end gap-1">
              <Info className="h-4 w-4 text-muted-foreground" title="مقارنة شهرية لعدد النقاط/الحاويات التي تمت خدمتها." />
              <h3 className="text-lg font-semibold">{labels.pointLabel} الشهرية</h3>
            </div>
            <p className="text-xs text-muted-foreground">مقارنة شهرية لعدد النقاط/الحاويات التي تمت خدمتها.</p>
          </div>
        </div>
        <div className="h-64" id="chart-monthly-containers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="containers" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-rose-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-service-duration", "service-duration")}>
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="متوسط مدة بقاء المركبة داخل النقطة قبل تسجيل الخروج." />
                <h3 className="text-lg font-semibold">متوسط وقت الخدمة (دقائق)</h3>
              </div>
              <p className="text-xs text-muted-foreground">متوسط مدة بقاء المركبة داخل النقطة قبل تسجيل الخروج.</p>
            </div>
          </div>
          <div className="h-64" id="chart-service-duration">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avgMinutes" stroke="#f97316" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-lime-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-vehicle-status", "vehicle-status")}>
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="يبيّن عدد المركبات النشطة مقابل غير النشطة حالياً." />
                <h3 className="text-lg font-semibold">حالة {labels.vehicleLabel}</h3>
              </div>
              <p className="text-xs text-muted-foreground">يبيّن عدد المركبات النشطة مقابل غير النشطة حالياً.</p>
            </div>
          </div>
          <div className="h-64" id="chart-vehicle-status">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-indigo-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-point-types", "point-types")}>
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="توزيع نسبي لأنواع النقاط داخل هذا الفرع." />
                <h3 className="text-lg font-semibold">توزيع أنواع {labels.pointLabel}</h3>
              </div>
              <p className="text-xs text-muted-foreground">توزيع نسبي لأنواع النقاط داخل هذا الفرع.</p>
            </div>
          </div>
          <div className="h-64" id="chart-point-types">
            {pointTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                لا توجد بيانات متاحة لعرض توزيع الأنواع حالياً.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pointTypeData} dataKey="count" nameKey="label" innerRadius={50} outerRadius={90}>
                    {pointTypeData.map((entry, index) => (
                      <Cell key={entry.type || index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-slate-50 p-4 shadow-sm text-right">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => exportChartAsPng("chart-event-types", "event-types")}>
              <Download className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Info className="h-4 w-4 text-muted-foreground" title="يوضح نسبة أحداث الدخول مقابل الخروج المسجلة من المناطق." />
                <h3 className="text-lg font-semibold">توزيع أنواع أحداث المناطق</h3>
              </div>
              <p className="text-xs text-muted-foreground">يوضح نسبة أحداث الدخول مقابل الخروج المسجلة من المناطق.</p>
            </div>
          </div>
          <div className="h-64" id="chart-event-types">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={eventTypeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {eventTypeData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartPalette[(index + 2) % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-right shadow-sm">
        <h3 className="text-lg font-semibold mb-3">تصدير CSV</h3>
        <div className="flex flex-wrap gap-3">
          <a className="rounded-lg border px-4 py-2 text-sm hover:bg-muted" href="/api/reports/vehicles">
            تحميل تقرير {labels.vehicleLabel} (CSV)
          </a>
          <a className="rounded-lg border px-4 py-2 text-sm hover:bg-muted" href="/api/reports/points">
            تحميل تقرير {labels.pointLabel} (CSV)
          </a>
        </div>
      </div>
    </div>
  );
}

