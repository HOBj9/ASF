"use client";

import { useEffect, useState } from "react";
import { MunicipalityMap } from "./municipality-map";
import { cn } from "@/lib/utils";
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
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-700",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-700",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${toneClasses[tone]} p-4 text-right shadow-sm`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

export function MunicipalityDashboard() {
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const [zones, setZones] = useState<AtharZone[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { labels } = useLabels();

  const chartPalette = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#facc15", "#14b8a6"];

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const liveVehiclesPromise = fetch("/api/vehicles/locations").then((r) => (r.ok ? r : null));
        const atharZonesPromise = fetch("/api/athar/zones").then((r) => (r.ok ? r : fetch("/api/points")));
        const [branchRes, liveVehiclesRes, pointsRes, routesRes, statsRes, eventsRes, analyticsRes] =
          await Promise.all([
            fetch("/api/municipality"),
            liveVehiclesPromise,
            atharZonesPromise,
            fetch("/api/routes"),
            fetch("/api/dashboard/stats"),
            fetch("/api/events?limit=8"),
            fetch("/api/dashboard/analytics"),
          ]);

        if (!active) return;

        if (branchRes.ok) {
          const data = await branchRes.json();
          setBranch(data.branch || data.municipality || null);
        }
        if (liveVehiclesRes?.ok) {
          const data = await liveVehiclesRes.json();
          setLiveVehicles(data.data || []);
        } else {
          setLiveVehicles([]);
        }
        if (pointsRes.ok) {
          const data = await pointsRes.json();
          setPoints(data.points || []);
          setZones(data.zones || []);
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
      fetch("/api/vehicles/locations")
        .then((res) => res.json())
        .then((data) => setLiveVehicles(data.data || []))
        .catch(() => null);
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => null);
      fetch("/api/events?limit=8")
        .then((res) => res.json())
        .then((data) => setEvents(data.events || []))
        .catch(() => null);
      fetch("/api/dashboard/analytics")
        .then((res) => res.json())
        .then((data) => setAnalytics(data))
        .catch(() => null);
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/vehicles/locations/websocket");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "bus_locations" && Array.isArray(payload?.data)) {
          setLiveVehicles(payload.data);
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, []);

  const pointTypeData = analytics?.pointTypes || [];
  const vehicleStatusData = [
    { name: "نشطة", value: analytics?.vehicleStatus?.active || 0 },
    { name: "غير نشطة", value: analytics?.vehicleStatus?.inactive || 0 },
  ];
  const eventTypeData = [
    { name: "دخول", value: analytics?.eventsByType?.zone_in || 0 },
    { name: "خروج", value: analytics?.eventsByType?.zone_out || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 via-sky-50 to-violet-50 p-6 shadow-sm text-right">
        <div className="text-sm text-muted-foreground">إدارة {labels.branchLabel}</div>
        <h2 className="text-2xl font-semibold mt-2">{branch?.name || "غير محدد بعد"}</h2>
        {branch?.addressText && (
          <p className="text-sm text-muted-foreground mt-1">{branch.addressText}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={`${labels.vehicleLabel} العاملة الآن`} value={stats?.activeVehicles ?? "--"} tone="emerald" />
        <StatCard label={`${labels.pointLabel} النشطة الآن`} value={stats?.activePoints ?? "--"} tone="sky" />
        <StatCard label={`${labels.pointLabel} المزارة اليوم`} value={stats?.visitedPointsToday ?? "--"} tone="amber" />
        <StatCard label="نسبة الإنجاز اليومية" value={`${stats?.dailyCompletionPercent ?? 0}%`} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className={cn("space-y-4", loading && "opacity-70")}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-right">الخريطة التشغيلية</h3>
            <div className="text-sm text-muted-foreground">
              {points.length} {labels.pointLabel} • {zones.length} مناطق • {routes.length} {labels.routeLabel}
            </div>
          </div>
          <MunicipalityMap municipality={branch} liveVehicles={liveVehicles} zones={zones} points={points} />
        </div>

        <div className="rounded-2xl border bg-card p-4 text-right shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">آخر الأحداث</h3>
            <span className="text-xs text-muted-foreground">آخر 8 أحداث</span>
          </div>
          <div className="space-y-3">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-emerald-50 p-4 shadow-sm text-right">
          <h3 className="text-lg font-semibold mb-3">{labels.pointLabel} المزارة يومياً</h3>
          <div className="h-64">
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
          <h3 className="text-lg font-semibold mb-3">الأحداث اليومية</h3>
          <div className="h-64">
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
        <h3 className="text-lg font-semibold mb-3">{labels.pointLabel} الشهرية</h3>
        <div className="h-64">
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
          <h3 className="text-lg font-semibold mb-3">متوسط زمن الخدمة (دقائق)</h3>
          <div className="h-64">
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
          <h3 className="text-lg font-semibold mb-3">حالة {labels.vehicleLabel}</h3>
          <div className="h-64">
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
          <h3 className="text-lg font-semibold mb-3">توزيع أنواع {labels.pointLabel}</h3>
          <div className="h-64">
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
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-slate-50 p-4 shadow-sm text-right">
          <h3 className="text-lg font-semibold mb-3">توزيع أنواع أحداث المناطق</h3>
          <div className="h-64">
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
