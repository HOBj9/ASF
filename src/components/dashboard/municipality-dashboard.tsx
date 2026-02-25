"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MunicipalityMap, type MapTab } from "./municipality-map";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";
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
import toast from "react-hot-toast";
import { playEventToastSound } from "@/lib/utils/event-toast-sound";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  displayText?: string;
  pointId?: string;
};

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

type MunicipalityDashboardProps = {
  isOrganizationAdmin?: boolean;
  isLineSupervisor?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
};

export function MunicipalityDashboard({
  isOrganizationAdmin = false,
  isLineSupervisor = false,
  organizationId: _organizationId,
  sessionBranchId,
}: MunicipalityDashboardProps = {}) {
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [orgBranches, setOrgBranches] = useState<Array<{ _id: string; name?: string; nameAr?: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const isLineSupervisorNoBranch = isLineSupervisor && !sessionBranchId && !isOrganizationAdmin;
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const [atharObjects, setAtharObjects] = useState<AtharObject[]>([]);
  const [zones, setZones] = useState<AtharZone[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsHasMore, setEventsHasMore] = useState(true);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMapTab, setActiveMapTab] = useState<MapTab>("live");
  const [mapPointsOnly, setMapPointsOnly] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [dailyDays, setDailyDays] = useState<7 | 14 | 30>(14);
  const [monthlyMonths, setMonthlyMonths] = useState<6 | 12>(12);
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
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsStreamConnectedRef = useRef(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const eventHighlightTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const eventsLoadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const eventsLengthRef = useRef(0);
  const eventsLoadMoreInProgressRef = useRef(false);
  const { labels } = useLabels();

  eventsLengthRef.current = events.length;

  const branchQuery =
    isOrganizationAdmin && selectedBranchId ? `?branchId=${encodeURIComponent(selectedBranchId)}` : "";
  const canLoadBranchData = !isLineSupervisorNoBranch && (!isOrganizationAdmin || !!selectedBranchId);

  const chartPalette = ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#facc15", "#14b8a6"];
  const mapTabLoading: Partial<Record<MapTab, boolean>> = {
    live: activeMapTab === "live" && !liveLoaded,
    points: activeMapTab === "points" && (!pointsLoaded || !markersLoaded),
    zones: activeMapTab === "zones" && !zonesLoaded,
    objects: activeMapTab === "objects" && !objectsLoaded,
  };

  function rememberEvents(eventList: EventItem[]) {
    for (const event of eventList) {
      if (event?._id) seenEventIdsRef.current.add(event._id);
    }
  }

  function markEventAsNew(eventId: string) {
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
  }

  useEffect(() => {
    if (!isOrganizationAdmin) return;
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.branches ?? [];
        setOrgBranches(
          list.map((b: any) => ({
            _id: String(b._id),
            name: b.name,
            nameAr: b.nameAr,
          }))
        );
      })
      .catch(() => setOrgBranches([]));
  }, [isOrganizationAdmin]);

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
    let active = true;

    async function loadInitial() {
      if (isOrganizationAdmin && !selectedBranchId) {
        if (active) setLoading(false);
        return;
      }
      try {
        const [branchRes, routesRes, statsRes, eventsRes, analyticsRes] =
          await Promise.all([
            fetch(`/api/municipality${branchQuery}`),
            fetch(`/api/routes${branchQuery}`),
            fetch(`/api/dashboard/stats${branchQuery}`),
            fetch(`/api/events?limit=10${branchQuery ? "&" + branchQuery.slice(1) : ""}`),
            fetch(`/api/dashboard/analytics?dailyDays=${dailyDays}&monthlyMonths=${monthlyMonths}${branchQuery ? "&" + branchQuery.slice(1) : ""}`),
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
          const initialEvents = Array.isArray(data.events) ? data.events : [];
          rememberEvents(initialEvents);
          setEvents(initialEvents);
          setEventsHasMore(data.hasMore !== false && initialEvents.length >= 10);
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
    if (!canLoadBranchData) return;
    const interval = setInterval(() => {
      fetch(`/api/dashboard/stats${branchQuery}`)
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => null);
      if (!eventsStreamConnectedRef.current) {
        fetch(`/api/events?limit=10${branchQuery ? "&" + branchQuery.slice(1) : ""}`)
          .then((res) => res.json())
          .then((data) => {
            const nextEvents = Array.isArray(data.events) ? data.events : [];
            rememberEvents(nextEvents);
            setEvents(nextEvents);
            setEventsHasMore(data.hasMore !== false && nextEvents.length >= 10);
          })
          .catch(() => null);
      }
      fetch(`/api/dashboard/analytics?dailyDays=${dailyDays}&monthlyMonths=${monthlyMonths}${branchQuery ? "&" + branchQuery.slice(1) : ""}`)
        .then((res) => res.json())
        .then((data) => setAnalytics(data))
        .catch(() => null);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dailyDays, monthlyMonths, isOrganizationAdmin, selectedBranchId, branchQuery, canLoadBranchData]);

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
  }, [canLoadBranchData, eventsHasMore, eventsLoadingMore, branchQuery]);

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

          playEventToastSound();

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
            duration: 8500,
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
            toast.warning(toastContent, toastOptions);
          }
        }
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    source.onerror = () => {
      eventsStreamConnectedRef.current = false;
      source.close();
    };

    return () => {
      eventsStreamConnectedRef.current = false;
      source.close();
    };
  }, [canLoadBranchData, branchQuery, labels.vehicleLabel, labels.pointLabel, labels.driverLabel]);

  // Fetch live vehicle locations as soon as branch is known (so map + live tab show on first load)
  useEffect(() => {
    if (!canLoadBranchData || liveLoaded) return;
    fetch(`/api/vehicles/locations${branchQuery}`)
      .then((res) => res.json())
      .then((data) => {
        setLiveVehicles(data.data || []);
        setLiveLoaded(true);
      })
      .catch(() => setLiveLoaded(true));
  }, [canLoadBranchData, liveLoaded, branchQuery]);

  // Preload map data in background after initial page load (non-blocking)
  useEffect(() => {
    if (!canLoadBranchData || loading) return;
    const zonesSuffix = branchQuery ? "&" + branchQuery.slice(1) : "";
    if (!pointsLoaded) {
      fetch(`/api/points${branchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          setPoints(data.points || []);
          setPointsLoaded(true);
        })
        .catch(() => setPointsLoaded(true));
    }
    if (!markersLoaded) {
      fetch(`/api/athar/markers${branchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          setAtharMarkers(data.markers || []);
          setMarkersLoaded(true);
        })
        .catch(() => setMarkersLoaded(true));
    }
    if (!zonesLoaded) {
      fetch(`/api/athar/zones?sync=false${zonesSuffix}`)
        .then((res) => res.json())
        .then((data) => {
          setZones(data.zones || []);
          if (Array.isArray(data.points) && data.points.length && !pointsLoaded) {
            setPoints(data.points);
            setPointsLoaded(true);
          }
          setZonesLoaded(true);
        })
        .catch(() => setZonesLoaded(true));
    }
    if (!objectsLoaded) {
      fetch(`/api/athar/objects${branchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          setAtharObjects(data.objects || []);
          setObjectsLoaded(true);
        })
        .catch(() => setObjectsLoaded(true));
    }
    if (!vehiclesLoaded) {
      fetch(`/api/vehicles${branchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          setVehicles(data.vehicles || []);
          setVehiclesLoaded(true);
        })
        .catch(() => setVehiclesLoaded(true));
    }
  }, [canLoadBranchData, loading, branchQuery, pointsLoaded, markersLoaded, zonesLoaded, objectsLoaded, vehiclesLoaded]);

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
    if (activeMapTab !== "live" || !canLoadBranchData) return;
    const wsUrl = `/api/vehicles/locations/websocket${branchQuery}`;
    const source = new EventSource(wsUrl);
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
  }, [activeMapTab, canLoadBranchData, branchQuery]);

  useEffect(() => {
    if (!canLoadBranchData) return;
    const zonesSuffix = branchQuery ? "&" + branchQuery.slice(1) : "";
    if (activeMapTab === "live" && !liveLoaded) {
      fetch(`/api/vehicles/locations${branchQuery}`)
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

    if (activeMapTab === "points" && (!pointsLoaded || !markersLoaded)) {
      if (!pointsLoaded) {
        fetch(`/api/points${branchQuery}`)
          .then((res) => res.json())
          .then((data) => {
            setPoints(data.points || []);
            setPointsLoaded(true);
          })
          .catch(() => setPointsLoaded(true));
      }
      if (!markersLoaded) {
        fetch(`/api/athar/markers${branchQuery}`)
          .then((res) => res.json())
          .then((data) => {
            setAtharMarkers(data.markers || []);
            setMarkersLoaded(true);
          })
          .catch(() => setMarkersLoaded(true));
      }
      return;
    }

    if (activeMapTab === "zones" && !zonesLoaded) {
      fetch(`/api/athar/zones?sync=false${zonesSuffix}`)
        .then((res) => res.json())
        .then((data) => {
          setZones(data.zones || []);
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
      fetch(`/api/athar/objects${branchQuery}`)
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
      fetch(`/api/vehicles${branchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          setVehicles(data.vehicles || []);
          setVehiclesLoaded(true);
        })
        .catch(() => {
          setVehiclesLoaded(true);
        });
    }
  }, [activeMapTab, canLoadBranchData, branchQuery, liveLoaded, pointsLoaded, markersLoaded, zonesLoaded, objectsLoaded, vehiclesLoaded]);

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isOrganizationAdmin && !selectedBranchId) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-cyan-900/20 p-6 shadow-sm text-right">
          <div className="text-sm text-muted-foreground">{labels.branchLabel || "الفرع"}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">اختر الفرع لعرض البيانات على الخريطة:</span>
            <Select
              value={selectedBranchId}
              onValueChange={(v) => setSelectedBranchId(v)}
            >
              <SelectTrigger className="w-[280px]">
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
        </div>
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-cyan-900/20 p-6 shadow-sm text-right">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">إدارة {labels.branchLabel}</div>
            <h2 className="text-2xl font-semibold mt-2">{branch?.name || "غير محدد بعد"}</h2>
            {branch?.addressText && (
              <p className="text-sm text-muted-foreground mt-1">{branch.addressText}</p>
            )}
          </div>
          {isOrganizationAdmin && (
            <Select
              value={selectedBranchId}
              onValueChange={(v) => setSelectedBranchId(v)}
            >
              <SelectTrigger className="w-[240px]">
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
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={`${labels.vehicleLabel} العاملة الآن`} value={stats?.activeVehicles ?? "--"} tone="emerald" />
        <StatCard label={`${labels.pointLabel} النشطة الآن`} value={stats?.activePoints ?? "--"} tone="sky" />
        <StatCard label={`${labels.pointLabel} المنجزة اليوم`} value={stats?.visitedPointsToday ?? "--"} tone="amber" />
        <StatCard label="نسبة الإنجاز اليومية" value={`${stats?.dailyCompletionPercent ?? 0}%`} tone="violet" />
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
                setMapFocusEvent(event);
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
    </div>
  );
}

