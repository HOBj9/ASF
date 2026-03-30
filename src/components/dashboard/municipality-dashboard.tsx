"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapTab } from "./municipality-map";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";
import { ChevronDown, ChevronUp, BarChart2, RefreshCw, Truck, CheckCircle2, MapPin, Info } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, Legend,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";

const MunicipalityMap = dynamic(
  () => import("./municipality-map").then((m) => ({ default: m.MunicipalityMap })),
  { ssr: false, loading: () => <Loading /> },
);
import { useLabels } from "@/hooks/use-labels";
import toast from "react-hot-toast";
import { playEventToastSound } from "@/lib/utils/event-toast-sound";
import { getNotificationPreferences } from "@/lib/utils/notification-preferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardOverviewData } from "@/lib/contracts/dashboard";
import type { DashboardEventItem } from "@/lib/types/dashboard-event";

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

type EventItem = DashboardEventItem;

function mergeUniqueEvents(primary: EventItem[], secondary: EventItem[], limit: number): EventItem[] {
  const seen = new Set<string>();
  const result: EventItem[] = [];

  for (const event of [...primary, ...secondary]) {
    if (!event?._id || seen.has(event._id)) continue;
    seen.add(event._id);
    result.push(event);
    if (result.length >= limit) break;
  }

  return result;
}

function StatCard({
  label,
  value,
  tone,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "sky" | "amber" | "violet";
  icon?: React.ReactNode;
  sub?: string;
}) {
  const toneClasses: Record<string, string> = {
    emerald: "from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-200 border-emerald-500/30",
    sky: "from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-200 border-cyan-500/30",
    amber: "from-amber-500/20 via-amber-500/10 to-transparent text-amber-200 border-amber-500/30",
    violet: "from-lime-500/20 via-lime-500/10 to-transparent text-lime-200 border-lime-500/30",
  };

  return (
    <div className={`rounded-lg border bg-gradient-to-br ${toneClasses[tone]} p-3 text-right shadow-sm backdrop-blur-sm`}>
      <div className="flex items-start justify-between gap-2">
        {icon && <div className="mt-0.5 shrink-0 opacity-60">{icon}</div>}
        <div className="min-w-0 flex-1">
          <div className="text-xs leading-tight text-foreground/75">{label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-foreground/60">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

type MunicipalityDashboardProps = {
  isOrganizationAdmin?: boolean;
  isLineSupervisor?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
  initialOverview?: DashboardOverviewData | null;
};

export function MunicipalityDashboard({
  isOrganizationAdmin = false,
  isLineSupervisor = false,
  organizationId: _organizationId,
  sessionBranchId,
  initialOverview,
}: MunicipalityDashboardProps = {}) {
  const [branch, setBranch] = useState<BranchInfo | null>(initialOverview?.branch ?? null);
  const [orgBranches, setOrgBranches] = useState<Array<{ _id: string; name?: string; nameAr?: string }>>(
    initialOverview?.orgBranches ?? [],
  );
  const [selectedBranchId, setSelectedBranchId] = useState(initialOverview?.selectedBranchId ?? "");
  const isLineSupervisorNoBranch = isLineSupervisor && !sessionBranchId && !isOrganizationAdmin;
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const [atharObjects, setAtharObjects] = useState<AtharObject[]>([]);
  const [zones, setZones] = useState<AtharZone[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [routes, setRoutes] = useState<Route[]>(initialOverview?.routes ?? []);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(initialOverview?.stats ?? null);
  const [analytics, setAnalytics] = useState<Analytics | null>(initialOverview?.analytics ?? null);
  const [events, setEvents] = useState<EventItem[]>(initialOverview?.events ?? []);
  const [eventsHasMore, setEventsHasMore] = useState(initialOverview?.eventsHasMore ?? true);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(!initialOverview);
  const [activeMapTab, setActiveMapTab] = useState<MapTab>("live");
  const [mapPointsOnly, setMapPointsOnly] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [dailyDays, setDailyDays] = useState<7 | 14 | 30>((initialOverview?.dailyDays as 7 | 14 | 30) ?? 14);
  const [monthlyMonths, setMonthlyMonths] = useState<6 | 12>((initialOverview?.monthlyMonths as 6 | 12) ?? 12);
  const [pointsLoaded, setPointsLoaded] = useState(false);
  const [atharMarkers, setAtharMarkers] = useState<
    Array<{ id: string; lat: number; lng: number; name?: string; icon?: string }>
  >([]);
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [objectsLoaded, setObjectsLoaded] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [newEventIds, setNewEventIds] = useState<Record<string, boolean>>({});
  const [mapFocusPointId, setMapFocusPointId] = useState<string | null>(null);
  const [mapFocusEvent, setMapFocusEvent] = useState<EventItem | null>(null);
  const [statsSectionCollapsed, setStatsSectionCollapsed] = useState(false);
  const [analyticsCollapsed, setAnalyticsCollapsed] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState("");
  const [eventsConnected, setEventsConnected] = useState(false);
  const [vehiclesConnected, setVehiclesConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsStreamConnectedRef = useRef(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const eventHighlightTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const eventsLoadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const eventsLengthRef = useRef(0);
  const eventsLoadMoreInProgressRef = useRef(false);
  const hasUsedInitialOverviewRef = useRef(Boolean(initialOverview));
  const overviewFetchInFlightRef = useRef(false);
  const mapDataFetchInFlightRef = useRef(false);
  const liveVehiclesFetchInFlightRef = useRef(false);
  const { labels } = useLabels(
    initialOverview
      ? {
          labels: initialOverview.labels,
          organizationName: initialOverview.organizationName,
        }
      : undefined,
  );

  eventsLengthRef.current = events.length;

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const s = Math.round((Date.now() - lastUpdated.getTime()) / 1000);
      setLastUpdatedText(s < 60 ? `${s} ث` : `${Math.floor(s / 60)} د`);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const branchQuery =
    isOrganizationAdmin && selectedBranchId ? `?branchId=${encodeURIComponent(selectedBranchId)}` : "";
  const canLoadBranchData = !isLineSupervisorNoBranch && (!isOrganizationAdmin || !!selectedBranchId);
  const overviewUrl = `/api/dashboard/overview?dailyDays=${dailyDays}&monthlyMonths=${monthlyMonths}${branchQuery ? `&${branchQuery.slice(1)}` : ""}`;
  const mapDataUrl = `/api/dashboard/map-data${branchQuery}`;
  const liveVehiclesUrl = `/api/vehicles/locations${branchQuery}`;

  const mapTabLoading: Partial<Record<MapTab, boolean>> = {
    live: activeMapTab === "live" && !liveLoaded,
    points: activeMapTab === "points" && (!pointsLoaded || !markersLoaded),
    zones: activeMapTab === "zones" && !zonesLoaded,
    objects: activeMapTab === "objects" && !objectsLoaded,
  };

  const rememberEvents = useCallback((eventList: EventItem[]) => {
    for (const event of eventList) {
      if (event?._id) seenEventIdsRef.current.add(event._id);
    }
  }, []);

  useEffect(() => {
    if (initialOverview?.events?.length) {
      rememberEvents(initialOverview.events);
    }
  }, [initialOverview, rememberEvents]);

  const markEventAsNew = useCallback((eventId: string) => {
    setNewEventIds((prev) => ({ ...prev, [eventId]: true }));

    const timer = eventHighlightTimersRef.current[eventId];
    if (timer) clearTimeout(timer);

    eventHighlightTimersRef.current[eventId] = setTimeout(() => {
      setNewEventIds((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      delete eventHighlightTimersRef.current[eventId];
    }, 5000);
  }, []);

  const loadOrganizationBranches = useCallback(async () => {
    try {
      const response = await fetch("/api/branches");
      const data = response.ok ? await response.json() : null;
      const list = data?.branches ?? [];
      setOrgBranches(
        list.map((b: any) => ({
          _id: String(b._id),
          name: b.name,
          nameAr: b.nameAr,
        })),
      );
    } catch {
      setOrgBranches([]);
    }
  }, []);

  const loadOverview = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!canLoadBranchData || overviewFetchInFlightRef.current) {
        if (!canLoadBranchData && !background) {
          setLoading(false);
        }
        return;
      }

      overviewFetchInFlightRef.current = true;
      try {
        if (!background) setLoading(true);

        const response = await fetch(overviewUrl);
        if (!response.ok) return;

        const data = await response.json();
        setBranch(data.branch || null);
        setRoutes(data.routes || []);
        setStats(data.stats || null);
        setAnalytics(data.analytics || null);
        setLastUpdated(new Date());
        setOrgBranches(data.orgBranches || []);

        if (!background || !eventsStreamConnectedRef.current) {
          const nextEvents = Array.isArray(data.events) ? data.events : [];
          rememberEvents(nextEvents);
          setEvents(nextEvents);
          setEventsHasMore(data.eventsHasMore !== false && nextEvents.length >= 10);
        }
      } finally {
        overviewFetchInFlightRef.current = false;
        if (!background) setLoading(false);
      }
    },
    [canLoadBranchData, overviewUrl, rememberEvents],
  );

  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadOverview();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadOverview]);

  const loadLiveVehicles = useCallback(async () => {
    if (!canLoadBranchData || liveVehiclesFetchInFlightRef.current) return;

    liveVehiclesFetchInFlightRef.current = true;
    try {
      const response = await fetch(liveVehiclesUrl);
      const data = response.ok ? await response.json() : null;
      setLiveVehicles(data?.data || []);
    } finally {
      liveVehiclesFetchInFlightRef.current = false;
      setLiveLoaded(true);
    }
  }, [canLoadBranchData, liveVehiclesUrl]);

  const loadMapData = useCallback(async () => {
    if (
      !canLoadBranchData ||
      mapDataFetchInFlightRef.current ||
      (pointsLoaded && markersLoaded && zonesLoaded && objectsLoaded && vehiclesLoaded)
    ) {
      return;
    }

    mapDataFetchInFlightRef.current = true;
    try {
      const response = await fetch(mapDataUrl);
      const data = response.ok ? await response.json() : null;
      setPoints(data?.points || []);
      setAtharMarkers(data?.markers || []);
      setZones(data?.zones || []);
      setAtharObjects(data?.objects || []);
      setVehicles(data?.vehicles || []);
    } finally {
      mapDataFetchInFlightRef.current = false;
      setPointsLoaded(true);
      setMarkersLoaded(true);
      setZonesLoaded(true);
      setObjectsLoaded(true);
      setVehiclesLoaded(true);
    }
  }, [
    canLoadBranchData,
    mapDataUrl,
    pointsLoaded,
    markersLoaded,
    zonesLoaded,
    objectsLoaded,
    vehiclesLoaded,
  ]);

  useEffect(() => {
    if (!isOrganizationAdmin || orgBranches.length > 0) return;
    void loadOrganizationBranches();
  }, [isOrganizationAdmin, orgBranches.length, loadOrganizationBranches]);

  useEffect(() => {
    if (isOrganizationAdmin && selectedBranchId) {
      setPointsLoaded(false);
      setMarkersLoaded(false);
      setZonesLoaded(false);
      setObjectsLoaded(false);
      setVehiclesLoaded(false);
      setLiveLoaded(false);
    }
  }, [isOrganizationAdmin, selectedBranchId]);

  useEffect(() => {
    const matchesInitialOverview =
      hasUsedInitialOverviewRef.current &&
      initialOverview &&
      (initialOverview.selectedBranchId ?? "") === selectedBranchId &&
      initialOverview.dailyDays === dailyDays &&
      initialOverview.monthlyMonths === monthlyMonths;

    if (matchesInitialOverview) {
      hasUsedInitialOverviewRef.current = false;
      setLoading(false);
    } else if (isOrganizationAdmin && !selectedBranchId) {
      setLoading(false);
    } else {
      void loadOverview();
    }

    if (!canLoadBranchData) return;
    const interval = setInterval(() => {
      void loadOverview({ background: true });
    }, 15000);

    return () => clearInterval(interval);
  }, [
    canLoadBranchData,
    dailyDays,
    initialOverview,
    isOrganizationAdmin,
    loadOverview,
    monthlyMonths,
    selectedBranchId,
  ]);

  useEffect(() => {
    seenEventIdsRef.current = new Set();
    setNewEventIds({});
    setEventsHasMore(true);
    eventsStreamConnectedRef.current = false;
  }, [branchQuery]);

  useEffect(() => {
    if (!canLoadBranchData || !eventsHasMore || eventsLoadingMore) return;
    const sentinel = eventsLoadMoreSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || eventsLoadMoreInProgressRef.current) return;
        eventsLoadMoreInProgressRef.current = true;
        const skip = eventsLengthRef.current;
        setEventsLoadingMore(true);
        fetch(`/api/events?limit=10&skip=${skip}${branchQuery ? "&" + branchQuery.slice(1) : ""}`)
          .then((res) => res.json())
          .then((data) => {
            const next = Array.isArray(data.events) ? data.events : [];
            if (next.length > 0) rememberEvents(next);
            setEvents((prev) => [...prev, ...next]);
            setEventsHasMore(data.hasMore !== false && next.length >= 10);
          })
          .catch(() => setEventsHasMore(false))
          .finally(() => {
            eventsLoadMoreInProgressRef.current = false;
            setEventsLoadingMore(false);
          });
      },
      { root: sentinel.closest(".overflow-y-auto") ?? undefined, rootMargin: "100px", threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [branchQuery, canLoadBranchData, eventsHasMore, eventsLoadingMore, rememberEvents]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(eventHighlightTimersRef.current)) {
        clearTimeout(timer);
      }
      eventHighlightTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!canLoadBranchData) {
      eventsStreamConnectedRef.current = false;
      return;
    }

    const url = `/api/events/websocket?limit=10${branchQuery ? "&" + branchQuery.slice(1) : ""}`;
    const source = new EventSource(url);

    source.onopen = () => {
      eventsStreamConnectedRef.current = true;
      setEventsConnected(true);
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.type === "events_snapshot" && Array.isArray(payload?.data)) {
          const snapshot = payload.data as EventItem[];
          rememberEvents(snapshot);
          setEvents((prev) => mergeUniqueEvents(snapshot, prev, 10));
          setEventsHasMore(true);
          return;
        }

        if (payload?.type === "zone_event" && payload?.data?._id) {
          const incomingEvent = payload.data as EventItem;
          if (seenEventIdsRef.current.has(incomingEvent._id)) return;

          // تحديث الإحصائيات فورًا عند كل حدث جديد
          fetch(`/api/dashboard/stats${branchQuery}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) setStats(data); })
            .catch(() => {});

          const notifPrefs = getNotificationPreferences();
          if (!notifPrefs.enabled) return;

          if (notifPrefs.soundEnabled) {
            playEventToastSound();
          }

          seenEventIdsRef.current.add(incomingEvent._id);
          setEvents((prev) => mergeUniqueEvents([incomingEvent], prev, 10));
          markEventAsNew(incomingEvent._id);

          const eventTypeLabel = incomingEvent.type === "zone_in" ? "دخول" : "خروج";
          const vehicleDisplay = incomingEvent.vehicleName || incomingEvent.imei || "—";
          const pointDisplay = incomingEvent.pointName || "—";
          const timeDisplay = incomingEvent.eventTimestamp || "—";
          const driverDisplay = incomingEvent.driverName || "—";
          const mainText =
            incomingEvent.displayText ||
            incomingEvent.name ||
            incomingEvent.pointName ||
            "تم استلام حدث جديد";

          const toastContent = (
            <div className="space-y-1.5 text-right" dir="rtl">
              <div className="font-semibold">{eventTypeLabel}</div>
              <div>{mainText}</div>
              <div className="text-xs opacity-90 space-y-0.5">
                <div>الوقت: {timeDisplay}</div>
                <div>{labels.vehicleLabel}: {vehicleDisplay}</div>
                <div>{labels.pointLabel}: {pointDisplay}</div>
                {incomingEvent.driverName ? (
                  <div>{labels.driverLabel}: {driverDisplay}</div>
                ) : null}
              </div>
            </div>
          );

          const toastOptions = {
            id: `zone-event-${incomingEvent._id}`,
            duration: notifPrefs.toastDurationSeconds * 1000,
            position: notifPrefs.toastPosition,
            style: {
              minWidth: "400px",
              maxWidth: "520px",
              padding: "1rem 1.25rem",
              fontSize: "1rem",
            },
          };

          if (incomingEvent.type === "zone_in") {
            toast.success(toastContent, toastOptions);
          } else {
            toast(toastContent, toastOptions);
          }
        }
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    source.onerror = () => {
      eventsStreamConnectedRef.current = false;
      setEventsConnected(false);
      source.close();
    };

    return () => {
      eventsStreamConnectedRef.current = false;
      setEventsConnected(false);
      source.close();
    };
  }, [
    branchQuery,
    canLoadBranchData,
    labels.driverLabel,
    labels.pointLabel,
    labels.vehicleLabel,
    markEventAsNew,
    rememberEvents,
  ]);

  // Preload map data in background after initial page load (non-blocking)
  useEffect(() => {
    if (!canLoadBranchData || loading) return;
    void loadMapData();
  }, [canLoadBranchData, loading, loadMapData]);

  useEffect(() => {
    if (activeMapTab !== "live" || !canLoadBranchData) return;
    const wsUrl = `/api/vehicles/locations/websocket${branchQuery}`;
    const source = new EventSource(wsUrl);
    source.onopen = () => setVehiclesConnected(true);
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
      setVehiclesConnected(false);
      source.close();
    };

    return () => {
      setVehiclesConnected(false);
      source.close();
    };
  }, [activeMapTab, canLoadBranchData, branchQuery]);

  useEffect(() => {
    if (!canLoadBranchData) return;
    if (activeMapTab === "live" && !liveLoaded) {
      void loadLiveVehicles();
      return;
    }

    if (
      (activeMapTab === "points" && (!pointsLoaded || !markersLoaded)) ||
      (activeMapTab === "zones" && !zonesLoaded) ||
      (activeMapTab === "objects" && !objectsLoaded)
    ) {
      void loadMapData();
    }
  }, [
    activeMapTab,
    canLoadBranchData,
    liveLoaded,
    loadLiveVehicles,
    loadMapData,
    markersLoaded,
    objectsLoaded,
    pointsLoaded,
    zonesLoaded,
  ]);

  if (loading && !branch && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isOrganizationAdmin && !selectedBranchId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-start gap-3 text-right">
          <span className="text-sm text-muted-foreground">تحديد {labels.branchLabel || "الفرع"} لعرض الخريطة:</span>
          <Select
            value={selectedBranchId}
            onValueChange={(v) => setSelectedBranchId(v)}
          >
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="اختر الفرع" />
            </SelectTrigger>
            <SelectContent>
              {orgBranches.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.nameAr || b.name || b._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg border bg-muted/30 py-6 text-center text-sm text-muted-foreground">
          اختر فرعاً من القائمة أعلاه لعرض الخريطة والإحصائيات.
        </div>
      </div>
    );
  }

  if (isLineSupervisorNoBranch) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-muted bg-card p-8 shadow-sm text-right">
          <p className="text-muted-foreground mb-4">
            لا توجد بيانات تتبع لعرضها لهذا الحساب. يمكنك الوصول إلى {labels.surveyLabel || "الاستبيانات"} وردودها من القائمة.
          </p>
          <Link href="/dashboard/surveys">
            <Button variant="default">الذهاب إلى {labels.surveyLabel || "الاستبيانات"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const chartPalette = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f97316", "#ef4444"];
  const vehicleStatusData = analytics?.vehicleStatus
    ? [
        { name: "نشطة", value: analytics.vehicleStatus.active },
        { name: "غير نشطة", value: analytics.vehicleStatus.inactive },
      ]
    : [];
  const pointTypeData = analytics?.pointTypes || [];
  const eventTypeData = analytics?.eventsByType
    ? Object.entries(analytics.eventsByType).map(([key, value]) => ({
        name: key === "zone_in" ? "دخول" : key === "zone_out" ? "خروج" : key,
        value: value as number,
      }))
    : [];

  const isLiveConnected = activeMapTab === "live" ? vehiclesConnected : eventsConnected;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-start gap-3 text-right">
        {isOrganizationAdmin && (
          <>
            <span className="text-sm text-muted-foreground">تحديد {labels.branchLabel || "الفرع"}:</span>
            <Select
              value={selectedBranchId}
              onValueChange={(v) => setSelectedBranchId(v)}
            >
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                {orgBranches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.nameAr || b.name || b._id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card/50 overflow-hidden">
        <div className="flex h-9 items-center justify-between gap-2 px-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={manualRefresh}
              disabled={isRefreshing}
              className="rounded p-0.5 transition hover:bg-muted/60 disabled:opacity-50"
              title="تحديث يدوي"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            {lastUpdated && <span>منذ {lastUpdatedText}</span>}
            <span
              className={`h-2 w-2 rounded-full ${isLiveConnected ? "bg-emerald-500" : "bg-red-400"}`}
              title={isLiveConnected ? "الاتصال نشط" : "غير متصل"}
            />
          </div>
          <Button
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs font-medium"
            onClick={() => setStatsSectionCollapsed((c) => !c)}
          >
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
            {statsSectionCollapsed ? "إظهار الإحصائيات" : "إخفاء الإحصائيات"}
            {statsSectionCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
        {!statsSectionCollapsed && (
          <div className="grid gap-3 border-t p-3 md:grid-cols-4">
            <StatCard
              label={`${labels.vehicleLabel} العاملة الآن`}
              value={stats?.activeVehicles ?? "--"}
              tone="emerald"
              icon={<Truck className="h-5 w-5" />}
              sub={vehicles.length > 0 ? `من ${vehicles.length} مركبة إجمالاً` : undefined}
            />
            <StatCard
              label={`${labels.pointLabel} النشطة الآن`}
              value={stats?.activePoints ?? "--"}
              tone="sky"
              icon={<MapPin className="h-5 w-5" />}
              sub={stats?.totalPoints ? `من ${stats.totalPoints} نقطة` : undefined}
            />
            <StatCard
              label={`${labels.pointLabel} المنجزة اليوم`}
              value={stats?.visitedPointsToday ?? "--"}
              tone="amber"
              icon={<CheckCircle2 className="h-5 w-5" />}
              sub={stats?.totalPoints ? `من ${stats.totalPoints} مجدولة` : undefined}
            />
            <StatCard
              label="نسبة الإنجاز اليومية"
              value={`${stats?.dailyCompletionPercent ?? 0}%`}
              tone="violet"
              icon={<BarChart2 className="h-5 w-5" />}
              sub={
                stats?.dailyCompletionPercent != null
                  ? stats.dailyCompletionPercent >= 100
                    ? "✓ مكتمل"
                    : "قيد التنفيذ"
                  : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div ref={mapSectionRef} className={cn(loading && "opacity-70")}>
          <MunicipalityMap
            municipality={branch}
            liveVehicles={liveVehicles}
            atharObjects={atharObjects}
            vehicles={vehicles}
            routes={routes}
            zones={zones}
            points={points}
            atharMarkers={atharMarkers}
            activeTab={activeMapTab}
            onTabChange={setActiveMapTab}
            tabLoading={mapTabLoading}
            showZonesWithPoints={!mapPointsOnly}
            onToggleMapView={() => setMapPointsOnly((p) => !p)}
            focusPointId={mapFocusPointId}
            eventDetailsForPoint={mapFocusEvent}
            events={events}
            newEventIds={newEventIds}
            onEventClick={(event) => {
              if (event.pointId) {
                setMapFocusPointId(event.pointId);
                setMapFocusEvent(event as EventItem);
                mapSectionRef.current?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            eventsLabel={labels.latestEventsLabel || "آخر الأحداث"}
            driverLabel={labels.driverLabel}
            pointLabel={labels.pointLabel}
            eventsHasMore={eventsHasMore}
            eventsLoadingMore={eventsLoadingMore}
            eventsLoadMoreSentinelRef={eventsLoadMoreSentinelRef}
          />
        </div>
      </div>

      {analytics && (
        <div className="rounded-lg border bg-card/50 overflow-hidden">
          <Button
            variant="ghost"
            className="w-full justify-between gap-2 rounded-none h-9 px-3 text-right font-medium text-sm"
            onClick={() => setAnalyticsCollapsed((c) => !c)}
          >
            <span className="flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
              التحليلات والرسوم البيانية
            </span>
            {analyticsCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
          {!analyticsCollapsed && (
            <div className="border-t p-4 space-y-4">
              <div className="flex flex-wrap gap-2 justify-end">
                <select
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                  value={dailyDays}
                  onChange={(e) => setDailyDays(Number(e.target.value) as 7 | 14 | 30)}
                >
                  <option value={7}>آخر 7 أيام</option>
                  <option value={14}>آخر 14 يوم</option>
                  <option value={30}>آخر 30 يوم</option>
                </select>
                <select
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                  value={monthlyMonths}
                  onChange={(e) => setMonthlyMonths(Number(e.target.value) as 6 | 12)}
                >
                  <option value={6}>آخر 6 أشهر</option>
                  <option value={12}>آخر 12 شهر</option>
                </select>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{labels.pointLabel} المنجزة يومياً</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="containers" fill="#0ea5e9" radius={[4, 4, 0, 0]} name={labels.pointLabel} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4 text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">الأحداث اليومية</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="events" stroke="#8b5cf6" fill="#a78bfa" fillOpacity={0.3} name="أحداث" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">متوسط وقت الخدمة (دقائق)</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avgMinutes" stroke="#f97316" strokeWidth={2} dot={false} name="دقائق" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4 text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{labels.pointLabel} الشهرية</h3>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="containers" fill="#10b981" radius={[4, 4, 0, 0]} name={labels.pointLabel} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {(vehicleStatusData.length > 0 || pointTypeData.length > 0 || eventTypeData.length > 0) && (
                <div className="grid gap-4 lg:grid-cols-3">
                  {vehicleStatusData.length > 0 && (
                    <div className="rounded-lg border bg-card p-4 text-right">
                      <h3 className="text-sm font-semibold mb-1">حالة {labels.vehicleLabel}</h3>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={vehicleStatusData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                              {vehicleStatusData.map((_, i) => (
                                <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {pointTypeData.length > 0 && (
                    <div className="rounded-lg border bg-card p-4 text-right">
                      <h3 className="text-sm font-semibold mb-1">توزيع أنواع {labels.pointLabel}</h3>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pointTypeData} dataKey="count" nameKey="label" innerRadius={35} outerRadius={65}>
                              {pointTypeData.map((_, i) => (
                                <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {eventTypeData.length > 0 && (
                    <div className="rounded-lg border bg-card p-4 text-right">
                      <h3 className="text-sm font-semibold mb-1">توزيع أنواع الأحداث</h3>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={eventTypeData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                              {eventTypeData.map((_, i) => (
                                <Cell key={i} fill={i === 0 ? "#10b981" : "#ef4444"} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 border-t pt-3">
                <a
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm hover:bg-muted",
                    isOrganizationAdmin && !selectedBranchId ? "pointer-events-none opacity-50" : ""
                  )}
                  href={isOrganizationAdmin && selectedBranchId ? `/api/reports/vehicles?branchId=${encodeURIComponent(selectedBranchId)}` : "/api/reports/vehicles"}
                >
                  تحميل تقرير {labels.vehicleLabel} (CSV)
                </a>
                <a
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm hover:bg-muted",
                    isOrganizationAdmin && !selectedBranchId ? "pointer-events-none opacity-50" : ""
                  )}
                  href={isOrganizationAdmin && selectedBranchId ? `/api/reports/points?branchId=${encodeURIComponent(selectedBranchId)}` : "/api/reports/points"}
                >
                  تحميل تقرير {labels.pointLabel} (CSV)
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEMPORARILY HIDDEN — statistics charts
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
          <a
            className={cn(
              "rounded-lg border px-4 py-2 text-sm",
              isOrganizationAdmin && !selectedBranchId ? "pointer-events-none opacity-50" : "hover:bg-muted"
            )}
            href={isOrganizationAdmin && selectedBranchId ? `/api/reports/vehicles?branchId=${encodeURIComponent(selectedBranchId)}` : "/api/reports/vehicles"}
          >
            تحميل تقرير {labels.vehicleLabel} (CSV)
          </a>
          <a
            className={cn(
              "rounded-lg border px-4 py-2 text-sm",
              isOrganizationAdmin && !selectedBranchId ? "pointer-events-none opacity-50" : "hover:bg-muted"
            )}
            href={isOrganizationAdmin && selectedBranchId ? `/api/reports/points?branchId=${encodeURIComponent(selectedBranchId)}` : "/api/reports/points"}
          >
            تحميل تقرير {labels.pointLabel} (CSV)
          </a>
        </div>
      </div>
      END TEMPORARILY HIDDEN */}
    </div>
  );
}


