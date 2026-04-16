"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-patch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/lib/assets/MarkerCluster.css";
import "react-leaflet-cluster/lib/assets/MarkerCluster.Default.css";
import L from "leaflet";
import { Maximize2, BusFront, MapPin, Hexagon, CarFront, X, BarChart2, CalendarDays, Layers, PanelRightOpen, PanelRightClose, Search, Play, Pause, SkipBack, SkipForward, SlidersHorizontal, History, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const FALLBACK_MARKER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 41' width='25' height='41'%3E%3Cpath fill='%232a7fff' stroke='%23fff' stroke-width='1.5' d='M12.5 0C5.6 0 0 5.6 0 12.5 0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23fff' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E";

const defaultIconUrl =
  typeof markerIcon?.src === "string" ? markerIcon.src : FALLBACK_MARKER_SVG;
const defaultIconRetinaUrl =
  typeof markerIcon2x?.src === "string" ? markerIcon2x.src : defaultIconUrl;
const defaultShadowUrl =
  typeof markerShadow?.src === "string" ? markerShadow.src : "";

type MapPoint = {
  _id: string | { toString(): string };
  name?: string;
  nameAr?: string;
  lat: number;
  lng: number;
  radiusMeters?: number;
  type?: string;
  zoneId?: string;
  addressText?: string;
  isActive?: boolean;
};

type AtharMarker = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  icon?: string;
};

type LiveVehicle = {
  id: string;
  provider: "athar" | "mobile_app" | "traccar";
  providerLabel: string;
  vehicleName: string;
  plateNumber: string | null;
  busNumber: string;
  driverName: string;
  route: string;
  routeId: string | null;
  status: "moving" | "stopped" | "offline";
  lastUpdate: string;
  lastReceivedAt: string | null;
  lastRecordedAt: string | null;
  speed: number;
  heading: number;
  accuracy: number | null;
  coordinates: [number, number] | null;
  imei?: string;
  trackingExternalId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  appVersion?: string | null;
};

type MapZone = {
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

type RouteSummary = {
  _id: string;
  name: string;
};

type MunicipalityInfo = {
  _id?: string;
  name: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
};

const defaultCenter: [number, number] = [33.5138, 36.2765];

const MAP_LAYER_BATCH_SIZE = 10;

const pointTypeLabels: Record<string, string> = {
  container: "حاوية",
  station: "محطة",
  facility: "منشأة",
  other: "أخرى",
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: defaultIconRetinaUrl,
  iconUrl: defaultIconUrl,
  shadowUrl: defaultShadowUrl,
});

/**
 * Defers fitBounds so MarkerClusterGroup / map panes are ready.
 * Immediate fitBounds after history load can fire moveend while cluster internals are null (getBounds).
 */
function scheduleMapFitBounds(
  getMap: () => L.Map | null,
  bounds: L.LatLngBounds,
  options: L.FitBoundsOptions,
  delayMs = 80
): () => void {
  let cancelled = false;
  let t1 = 0;
  let t2 = 0;
  t1 = window.setTimeout(() => {
    if (cancelled) return;
    const map = getMap();
    if (!map) return;
    try {
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, options);
    } catch {
      t2 = window.setTimeout(() => {
        if (cancelled) return;
        const m = getMap();
        if (!m) return;
        try {
          m.invalidateSize({ animate: false });
          m.fitBounds(bounds, options);
        } catch {
          /* cluster / map still settling */
        }
      }, 150);
    }
  }, delayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const LABEL_STYLE =
  "position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);white-space:nowrap;" +
  "background:#fff;border:1px solid #e2e8f0;font-size:11px;font-weight:500;color:#000;" +
  "padding:1px 6px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.15);pointer-events:none;";

/** Default icon for points (نقاط) when no custom icon is provided; avoids broken Leaflet default image */
function getDefaultPointIcon(label?: string): L.DivIcon {
  const labelHtml = label ? `<div style="${LABEL_STYLE}">${escapeHtml(label)}</div>` : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;overflow:visible;width:28px;height:36px;">
      ${labelHtml}
      <div style="width:28px;height:36px;display:flex;align-items:center;justify-content:center;
        font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));">📍</div>
    </div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

/** Default icon for vehicles/markers when no custom icon is provided (e.g. Athar marker without icon) */

/** Leaflet icon from Athar marker icon URL (e.g. SVG from API); falls back to default vehicle icon when missing */
function getAtharMarkerIcon(iconUrl: string | undefined, label?: string): L.DivIcon {
  const labelHtml = label ? `<div style="${LABEL_STYLE}">${escapeHtml(label)}</div>` : "";
  if (iconUrl?.trim()) {
    return L.divIcon({
      className: "",
      html: `<div style="position:relative;overflow:visible;width:32px;height:32px;">
        ${labelHtml}
        <img src="${escapeHtml(iconUrl)}" style="width:32px;height:32px;" />
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;overflow:visible;width:28px;height:28px;">
      ${labelHtml}
      <div style="width:28px;height:28px;border-radius:50%;
        background:#0ea5e9;display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
        font-size:14px;line-height:1;">🚗</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function getBusIcon(status: LiveVehicle["status"], heading: number, label?: string) {
  const bgColor = status === "moving" ? "#16a34a" : status === "stopped" ? "#f59e0b" : "#6b7280";
  const labelHtml = label ? `<div style="${LABEL_STYLE}">${escapeHtml(label)}</div>` : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;overflow:visible;width:26px;height:26px;">
      ${labelHtml}
      <div style="
        width:26px;height:26px;border-radius:999px;background:${bgColor};
        display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
        position:relative;
      ">
        <span style="
          position:absolute;top:-10px;left:50%;transform:translateX(-50%) rotate(${Number(heading) || 0}deg);
          color:#dc2626;font-size:14px;line-height:1;
        ">▲</span>
        <span style="font-size:12px;line-height:1">🚌</span>
      </div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -10],
  });
}

const statusLabel: Record<LiveVehicle["status"], string> = {
  moving: "تعمل",
  stopped: "متوقفة",
  offline: "غير متصلة",
};

const liveProviderFilterLabels: Record<LiveVehicle["provider"] | "all", string> = {
  all: "كل المصادر",
  athar: "أثر",
  mobile_app: "GPS الموبايل",
  traccar: "تراكار",
};

const liveStatusFilterLabels: Record<LiveVehicle["status"] | "all", string> = {
  all: "كل الحالات",
  moving: "تعمل",
  stopped: "متوقفة",
  offline: "غير متصلة",
};

function getLiveProviderColor(provider: LiveVehicle["provider"]): string {
  if (provider === "mobile_app") return "#0891b2";
  if (provider === "traccar") return "#7c3aed";
  return "#2563eb";
}

function getLiveVehicleSymbol(provider: LiveVehicle["provider"]): string {
  if (provider === "mobile_app") return "📱";
  if (provider === "traccar") return "🛰️";
  return "🚚";
}

function getLiveVehicleIcon(vehicle: LiveVehicle, label?: string) {
  const providerColor = getLiveProviderColor(vehicle.provider);
  const statusColor = vehicle.status === "moving" ? "#16a34a" : vehicle.status === "stopped" ? "#f59e0b" : "#64748b";
  const labelHtml = label ? `<div style="${LABEL_STYLE}">${escapeHtml(label)}</div>` : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;overflow:visible;width:32px;height:32px;">
      ${labelHtml}
      <div style="
        width:32px;height:32px;border-radius:999px;background:${providerColor};
        display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 0 0 2px rgba(255,255,255,.2),0 10px 22px rgba(15,23,42,.3);
        position:relative;
      ">
        <span style="
          position:absolute;top:-10px;left:50%;transform:translateX(-50%) rotate(${Number(vehicle.heading) || 0}deg);
          color:#dc2626;font-size:14px;line-height:1;
        ">▲</span>
        <span style="font-size:14px;line-height:1">${getLiveVehicleSymbol(vehicle.provider)}</span>
        <span style="position:absolute;bottom:-3px;right:-3px;width:11px;height:11px;border-radius:999px;background:${statusColor};border:2px solid #fff;"></span>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -12],
  });
}

function isPointInsidePolygon(lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalizeZoneId(zoneId?: string | null): string {
  if (!zoneId) return "";
  const value = String(zoneId).replace(/\?.*$/, "").trim();
  if (!value) return "";
  return value.match(/^(\d+)/)?.[1] ?? value;
}

function formatDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDefaultHistoryFromInput(): string {
  return formatDateTimeLocalInput(new Date(Date.now() - 6 * 60 * 60 * 1000));
}

function createDefaultHistoryToInput(): string {
  return formatDateTimeLocalInput(new Date());
}

export type MapTab = "live" | "points" | "zones" | "objects";

export type EventDetailsForPoint = {
  displayText?: string;
  eventTimestamp?: string;
  vehicleName?: string;
  type?: string;
  pointName?: string;
  driverName?: string;
};

export type MapEventItem = {
  _id: string;
  type?: string;
  name?: string;
  imei?: string;
  eventTimestamp?: string;
  pointName?: string;
  vehicleName?: string;
  driverName?: string;
  displayText?: string;
  pointId?: string;
};

type TrackingSelection = {
  type: "vehicle" | "event" | null;
  id: string | null;
};

type VehicleHistoryTrackPoint = {
  provider: LiveVehicle["provider"];
  source: "tracking_sample" | "athar_route";
  recordedAt: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  altitude: number | null;
};

type VehicleHistoryTrack = {
  vehicle: {
    id: string;
    name: string;
    plateNumber: string | null;
    provider: LiveVehicle["provider"];
    providerLabel: string;
    routeId: string | null;
    routeName: string | null;
    imei: string | null;
    trackingExternalId: string | null;
  };
  summary: {
    pointsCount: number;
    startedAt: string | null;
    endedAt: string | null;
    source: "tracking_sample" | "athar_route";
    savedToSystem: boolean;
  };
  points: VehicleHistoryTrackPoint[];
};

type RightPanelType = "athar-live" | "system-points" | "events" | "cars" | "live" | "layers" | null;

export function MunicipalityMap({
  municipality,
  liveVehicles = [],
  atharObjects = [],
  vehicles = [],
  routes = [],
  zones = [],
  points,
  atharMarkers = [],
  activeTab,
  onTabChange,
  tabLoading = {},
  showZonesWithPoints = false,
  onToggleMapView,
  focusPointId = null,
  eventDetailsForPoint = null,
  events = [],
  newEventIds = {},
  onEventClick,
  eventsLabel = "آخر الأحداث",
  driverLabel = "السائق",
  pointLabel = "نقطة",
  eventsHasMore = false,
  eventsLoadingMore = false,
  eventsLoadMoreSentinelRef,
  trackingSource = "all",
  trackingSourceLabel,
  reportsBranchId = null,
  reportsOrganizationId = null,
  defaultRightPanel = null,
  fixedLiveProviderFilter = "all",
  onTrackingSelectionChange,
}: {
  municipality: MunicipalityInfo | null;
  liveVehicles?: LiveVehicle[];
  atharObjects?: AtharObject[];
  vehicles?: VehicleSummary[];
  routes?: RouteSummary[];
  zones?: MapZone[];
  points: MapPoint[];
  atharMarkers?: AtharMarker[];
  activeTab: MapTab;
  onTabChange: (tab: MapTab) => void;
  tabLoading?: Partial<Record<MapTab, boolean>>;
  showZonesWithPoints?: boolean;
  onToggleMapView?: () => void;
  focusPointId?: string | null;
  eventDetailsForPoint?: EventDetailsForPoint | null;
  events?: MapEventItem[];
  newEventIds?: Record<string, boolean>;
  onEventClick?: (event: MapEventItem) => void;
  eventsLabel?: string;
  driverLabel?: string;
  pointLabel?: string;
  eventsHasMore?: boolean;
  eventsLoadingMore?: boolean;
  eventsLoadMoreSentinelRef?: React.MutableRefObject<HTMLDivElement | null>;
  trackingSource?: LiveVehicle["provider"] | "all";
  trackingSourceLabel?: string;
  reportsBranchId?: string | null;
  reportsOrganizationId?: string | null;
  defaultRightPanel?: Exclude<RightPanelType, null> | null;
  fixedLiveProviderFilter?: LiveVehicle["provider"] | "all";
  onTrackingSelectionChange?: (selection: TrackingSelection) => void;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanelType>(defaultRightPanel);
  const [lastOpenedPanel, setLastOpenedPanel] = useState<Exclude<RightPanelType, null>>(defaultRightPanel || "system-points");
  const [showVehicleNamesOnMap, setShowVehicleNamesOnMap] = useState(true);
  const [atharCarsSearchQuery, setAtharCarsSearchQuery] = useState("");
  const [liveVehiclesSearchQuery, setLiveVehiclesSearchQuery] = useState("");
  const [liveProviderFilter, setLiveProviderFilter] = useState<LiveVehicle["provider"] | "all">(fixedLiveProviderFilter);
  const [liveStatusFilter, setLiveStatusFilter] = useState<LiveVehicle["status"] | "all">("all");
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);
  const [historyFrom, setHistoryFrom] = useState(() => createDefaultHistoryFromInput());
  const [historyTo, setHistoryTo] = useState(() => createDefaultHistoryToInput());
  const [historyTrack, setHistoryTrack] = useState<VehicleHistoryTrack | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [liveDisplayMode, setLiveDisplayMode] = useState<"fleet" | "history">("fleet");
  const [historyPlaybackIndex, setHistoryPlaybackIndex] = useState(0);
  const [historyPlaybackPlaying, setHistoryPlaybackPlaying] = useState(false);
  const [historyPlaybackSpeedMs, setHistoryPlaybackSpeedMs] = useState(800);
  const [enhancedTrackGeometry, setEnhancedTrackGeometry] = useState<{ type: "LineString"; coordinates: number[][] } | null>(null);
  const [enhancedTrackLoading, setEnhancedTrackLoading] = useState(false);
  const [enhancedTrackMode, setEnhancedTrackMode] = useState<"raw" | "enhanced" | "both">("raw");
  const [eventsSearchQuery, setEventsSearchQuery] = useState("");
  const [pointTypeFilter, setPointTypeFilter] = useState<string | null>(null);
  const [pointPanelSearch, setPointPanelSearch] = useState("");
  const [objectsPanelOpen, setObjectsPanelOpen] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<AtharMarker | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [selectedEventItem, setSelectedEventItem] = useState<MapEventItem | null>(null);
  const [trackingObjectId, setTrackingObjectId] = useState<string | null>(null);
  const trackingLastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [layersVisibleLimit, setLayersVisibleLimit] = useState(MAP_LAYER_BATCH_SIZE);
  const mapRef = useRef<L.Map | null>(null);
  const currentTabLoading = !!tabLoading[activeTab];
  const pointDetailsPanelOpen = selectedPoint != null || selectedMarker != null;

  const zonesVisible = activeTab === "zones" || (activeTab === "points" && showZonesWithPoints);
  useEffect(() => {
    if (!zonesVisible) setSelectedZone(null);
  }, [activeTab, showZonesWithPoints, zonesVisible]);

  useEffect(() => {
    setHistoryTrack(null);
    setHistoryVehicleId(null);
    setHistoryError(null);
    setLiveDisplayMode("fleet");
    setHistoryPlaybackIndex(0);
    setHistoryPlaybackPlaying(false);
  }, [municipality?._id]);

  useEffect(() => {
    setLiveProviderFilter(fixedLiveProviderFilter);
  }, [fixedLiveProviderFilter]);

  useEffect(() => {
    if (!defaultRightPanel) return;
    setRightPanel(defaultRightPanel);
    setLastOpenedPanel(defaultRightPanel);
  }, [defaultRightPanel]);

  useEffect(() => {
    setSelectedEventItem(null);
  }, [municipality?._id, trackingSource]);

  const liveVehicleInventory = useMemo(
    () => liveVehicles.filter((v) => Array.isArray(v.coordinates) && v.coordinates.length === 2),
    [liveVehicles]
  );

  const visibleLiveVehicles = useMemo(() => {
    return liveVehicleInventory.filter(
      (vehicle) =>
        (liveProviderFilter === "all" || vehicle.provider === liveProviderFilter) &&
        (liveStatusFilter === "all" || vehicle.status === liveStatusFilter)
    );
  }, [liveVehicleInventory, liveProviderFilter, liveStatusFilter]);

  const liveProviderCounts = useMemo(
    () => ({
      athar: liveVehicleInventory.filter((vehicle) => vehicle.provider === "athar").length,
      mobile_app: liveVehicleInventory.filter((vehicle) => vehicle.provider === "mobile_app").length,
      traccar: liveVehicleInventory.filter((vehicle) => vehicle.provider === "traccar").length,
    }),
    [liveVehicleInventory]
  );

  const liveStatusCounts = useMemo(
    () => ({
      moving: liveVehicleInventory.filter((vehicle) => vehicle.status === "moving").length,
      stopped: liveVehicleInventory.filter((vehicle) => vehicle.status === "stopped").length,
      offline: liveVehicleInventory.filter((vehicle) => vehicle.status === "offline").length,
    }),
    [liveVehicleInventory]
  );

  const vehicleZoneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of liveVehicleInventory) {
      const [lat, lng] = vehicle.coordinates as [number, number];
      const zone = zones.find((z) => z.vertices?.length >= 3 && isPointInsidePolygon(lat, lng, z.vertices));
      map.set(vehicle.id, zone?.name || "خارج المناطق");
    }
    return map;
  }, [liveVehicleInventory, zones]);

  const objectByImei = useMemo(() => {
    const map = new Map<string, AtharObject>();
    for (const obj of atharObjects) {
      if (obj.imei) map.set(String(obj.imei), obj);
    }
    return map;
  }, [atharObjects]);

  const vehicleByImei = useMemo(() => {
    const map = new Map<string, VehicleSummary>();
    for (const vehicle of vehicles) {
      if (vehicle.imei) map.set(String(vehicle.imei), vehicle);
    }
    return map;
  }, [vehicles]);

  const vehicleByAtharId = useMemo(() => {
    const map = new Map<string, VehicleSummary>();
    for (const vehicle of vehicles) {
      if (vehicle.atharObjectId) map.set(String(vehicle.atharObjectId), vehicle);
    }
    return map;
  }, [vehicles]);

  const routeById = useMemo(() => {
    const map = new Map<string, RouteSummary>();
    for (const route of routes) {
      map.set(String(route._id), route);
    }
    return map;
  }, [routes]);

  const zoneNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of zones) {
      const zoneId = normalizeZoneId(zone.id);
      if (!zoneId) continue;
      map.set(zoneId, zone.name || `منطقة ${zoneId}`);
    }
    return map;
  }, [zones]);

  const filteredAtharObjects = useMemo(() => {
    const q = atharCarsSearchQuery.trim().toLowerCase();
    if (!q) return atharObjects;
    return atharObjects.filter(
      (obj) =>
        (obj.name || "").toLowerCase().includes(q) ||
        (obj.plateNumber || "").toLowerCase().includes(q) ||
        (obj.imei || "").toLowerCase().includes(q)
    );
  }, [atharObjects, atharCarsSearchQuery]);

  const filteredEvents = useMemo(() => {
    const q = eventsSearchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (event) =>
        (event.displayText || "").toLowerCase().includes(q) ||
        (event.name || "").toLowerCase().includes(q) ||
        (event.pointName || "").toLowerCase().includes(q) ||
        (event.vehicleName || "").toLowerCase().includes(q) ||
        (event.driverName || "").toLowerCase().includes(q) ||
        (event.imei || "").toLowerCase().includes(q)
    );
  }, [events, eventsSearchQuery]);

  const filteredLiveVehicles = useMemo(() => {
    const q = liveVehiclesSearchQuery.trim().toLowerCase();
    if (!q) return visibleLiveVehicles;
    return visibleLiveVehicles.filter(
      (vehicle) =>
        (vehicle.vehicleName || "").toLowerCase().includes(q) ||
        (vehicle.busNumber || "").toLowerCase().includes(q) ||
        (vehicle.plateNumber || "").toLowerCase().includes(q) ||
        (vehicle.driverName || "").toLowerCase().includes(q) ||
        (vehicle.providerLabel || "").toLowerCase().includes(q) ||
        (vehicle.route || "").toLowerCase().includes(q) ||
        (vehicle.deviceName || "").toLowerCase().includes(q) ||
        (vehicle.trackingExternalId || "").toLowerCase().includes(q) ||
        (vehicle.imei || "").toLowerCase().includes(q)
    );
  }, [liveVehiclesSearchQuery, visibleLiveVehicles]);

  const selectedLiveVehicle = useMemo(() => {
    const selectedId = historyTrack?.vehicle.id || historyVehicleId;
    if (!selectedId) return null;
    return liveVehicleInventory.find((vehicle) => vehicle.id === selectedId) || null;
  }, [historyTrack, historyVehicleId, liveVehicleInventory]);

  const normalizeLookupText = useCallback((value?: string | null) => {
    return (value || "").trim().toLowerCase();
  }, []);

  const selectedEventVehicle = useMemo(() => {
    if (!selectedEventItem?.vehicleName) return null;
    const target = normalizeLookupText(selectedEventItem.vehicleName);
    if (!target) return null;
    return (
      liveVehicleInventory.find((vehicle) => {
        const names = [
          vehicle.vehicleName,
          vehicle.busNumber,
          vehicle.plateNumber,
          vehicle.driverName,
        ].map((value) => normalizeLookupText(value));
        return names.some((candidate) => candidate && (candidate === target || candidate.includes(target) || target.includes(candidate)));
      }) || null
    );
  }, [liveVehicleInventory, normalizeLookupText, selectedEventItem?.vehicleName]);

  const activeHistoryVehicle = useMemo(() => {
    const candidateId = historyTrack?.vehicle.id || historyVehicleId;
    if (!candidateId) return null;
    return liveVehicleInventory.find((vehicle) => vehicle.id === candidateId) || null;
  }, [historyTrack, historyVehicleId, liveVehicleInventory]);

  const currentPlaybackPoint = useMemo(() => {
    if (!historyTrack?.points?.length) return null;
    const safeIndex = Math.max(0, Math.min(historyPlaybackIndex, historyTrack.points.length - 1));
    return historyTrack.points[safeIndex] || null;
  }, [historyPlaybackIndex, historyTrack]);

  const reportTimeRange = useMemo(() => {
    const fromValue = historyFrom ? new Date(historyFrom) : null;
    const toValue = historyTo ? new Date(historyTo) : null;
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setHours(0, 0, 0, 0);
    const defaultTo = new Date(now);
    defaultTo.setHours(23, 59, 59, 999);
    return {
      from: fromValue && !Number.isNaN(fromValue.getTime()) ? fromValue.toISOString() : defaultFrom.toISOString(),
      to: toValue && !Number.isNaN(toValue.getTime()) ? toValue.toISOString() : defaultTo.toISOString(),
    };
  }, [historyFrom, historyTo]);

  const buildTrackingLink = useCallback((pathname: string, params: Record<string, string | null | undefined>) => {
    const searchParams = new URLSearchParams();
    if (reportsOrganizationId) searchParams.set("organizationId", reportsOrganizationId);
    if (reportsBranchId) searchParams.set("branchId", reportsBranchId);
    if (trackingSource !== "all") searchParams.set("source", trackingSource);
    searchParams.set("from", reportTimeRange.from);
    searchParams.set("to", reportTimeRange.to);
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    return `${pathname}?${searchParams.toString()}`;
  }, [reportTimeRange.from, reportTimeRange.to, reportsBranchId, reportsOrganizationId, trackingSource]);

  const getVehicleReportsHref = useCallback((vehicleId: string) => {
    return buildTrackingLink("/dashboard/event-reports", { vehicleId });
  }, [buildTrackingLink]);

  const getVehicleVisitLogHref = useCallback((vehicleId: string) => {
    return buildTrackingLink("/dashboard/visit-log", { vehicleId, tab: "visits" });
  }, [buildTrackingLink]);

  const getVehicleGeneralReportHref = useCallback((vehicleId: string) => {
    return buildTrackingLink("/dashboard/reports", { vehicleId, period: "custom" });
  }, [buildTrackingLink]);

  const getPointEventReportHref = useCallback((pointId: string) => {
    return buildTrackingLink("/dashboard/event-reports", { pointId });
  }, [buildTrackingLink]);

  const getPointVisitLogHref = useCallback((pointId: string) => {
    return buildTrackingLink("/dashboard/visit-log", { pointId, tab: "visits" });
  }, [buildTrackingLink]);

  const isHistoryViewMode = activeTab === "live" && liveDisplayMode === "history" && !!historyTrack?.points?.length;

  useEffect(() => {
    if (!onTrackingSelectionChange) return;
    if (selectedEventItem?._id) {
      onTrackingSelectionChange({ type: "event", id: selectedEventItem._id });
      return;
    }
    if (selectedLiveVehicle?.id) {
      onTrackingSelectionChange({ type: "vehicle", id: selectedLiveVehicle.id });
      return;
    }
    onTrackingSelectionChange({ type: null, id: null });
  }, [onTrackingSelectionChange, selectedEventItem?._id, selectedLiveVehicle?.id]);

  useEffect(() => {
    if (focusPointId && points.length > 0) {
      const point = points.find((p) => String(p._id) === String(focusPointId));
      if (point) {
        setSelectedPoint(point);
        if (rightPanel !== "events") {
          setRightPanel("system-points");
          setLastOpenedPanel("system-points");
        }
        onTabChange("points");
        const t = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.flyTo([Number(point.lat), Number(point.lng)], 16, { duration: 0.5 });
          }
        }, 150);
        return () => clearTimeout(t);
      }
    }
  }, [focusPointId, points, onTabChange, rightPanel]);

  useEffect(() => {
    if (activeTab !== "objects") {
      setTrackingObjectId(null);
    }
    if (activeTab !== "live") {
      setLiveDisplayMode("fleet");
      setHistoryPlaybackPlaying(false);
    }
    if (activeTab !== "points") {
      setSelectedPoint(null);
      setPointTypeFilter(null);
      setPointPanelSearch("");
    }
    setLayersVisibleLimit(MAP_LAYER_BATCH_SIZE);
  }, [activeTab]);

  useEffect(() => {
    setLiveDisplayMode("fleet");
    setHistoryPlaybackPlaying(false);
  }, [liveProviderFilter, liveStatusFilter, liveVehiclesSearchQuery]);

  const maxLayerCountForTab = useMemo(() => {
    if (activeTab === "points") return Math.max(points.length, atharMarkers.length);
    if (activeTab === "zones") return zones.length;
    if (activeTab === "objects") return atharObjects.filter((o) => o.lat != null && o.lng != null).length;
    return 0;
  }, [activeTab, points.length, atharMarkers.length, zones.length, atharObjects]);

  useEffect(() => {
    if (maxLayerCountForTab <= MAP_LAYER_BATCH_SIZE) return;
    if (layersVisibleLimit >= maxLayerCountForTab) return;
    const t = setInterval(() => {
      setLayersVisibleLimit((prev) => Math.min(prev + MAP_LAYER_BATCH_SIZE, maxLayerCountForTab));
    }, 80);
    return () => clearInterval(t);
  }, [maxLayerCountForTab, layersVisibleLimit]);

  useEffect(() => {
    if (activeTab !== "objects") return;
    if (!atharObjects.length) {
      setSelectedObjectId(null);
      return;
    }
    if (!selectedObjectId || !atharObjects.some((obj) => String(obj.id) === String(selectedObjectId))) {
      setSelectedObjectId(String(atharObjects[0].id));
    }
  }, [activeTab, atharObjects, selectedObjectId]);

  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    return atharObjects.find((obj) => String(obj.id) === String(selectedObjectId)) || null;
  }, [atharObjects, selectedObjectId]);

  const matchedVehicle = useMemo(() => {
    if (!selectedObject) return null;
    return (
      vehicleByAtharId.get(String(selectedObject?.id)) ||
      vehicleByImei.get(String(selectedObject?.imei)) ||
      null
    );
  }, [selectedObject, vehicleByAtharId, vehicleByImei]);

  const matchedRoute = useMemo(() => {
    if (!matchedVehicle?.routeId) return null;
    return routeById.get(String(matchedVehicle?.routeId)) || null;
  }, [matchedVehicle, routeById]);

  const showPanel = useCallback((panel: Exclude<RightPanelType, null>) => {
    setRightPanel(panel);
    setLastOpenedPanel(panel);
  }, []);

  const togglePanel = useCallback((panel: Exclude<RightPanelType, null>) => {
    setRightPanel((currentPanel) => {
      if (currentPanel === panel) return null;
      setLastOpenedPanel(panel);
      return panel;
    });
    if (panel === "athar-live") {
      onTabChange("objects");
      return;
    }
    if (panel === "live") {
      onTabChange("live");
      return;
    }
    onTabChange("points");
  }, [onTabChange]);

  const focusOnPoint = useCallback((point: MapPoint) => {
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    setSelectedPoint(point);
    showPanel("system-points");
    onTabChange("points");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    // setTimeout يضمن تنفيذ flyTo بعد اكتمال أي إعادة رندر ناتجة عن تغيير التبويب
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 17, { duration: 0.6 });
      }
    }, 100);
  }, [onTabChange, showPanel]);

  const focusOnObject = useCallback((obj: AtharObject | null) => {
    if (!obj || obj.lat == null || obj.lng == null) return;
    showPanel("athar-live");
    onTabChange("objects");
    setTrackingObjectId(obj.id);
    const lat = Number(obj.lat);
    const lng = Number(obj.lng);
    trackingLastPosRef.current = { lat, lng };
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 17, { duration: 0.6 });
      }
    }, 100);
  }, [onTabChange, showPanel]);

  const focusOnLiveVehicle = useCallback((vehicle: LiveVehicle | null) => {
    if (!vehicle || !Array.isArray(vehicle.coordinates) || vehicle.coordinates.length !== 2) return;
    setLiveDisplayMode("fleet");
    setHistoryPlaybackPlaying(false);
    setHistoryVehicleId(vehicle.id);
    setSelectedEventItem(null);
    showPanel("live");
    onTabChange("live");
    if (mapRef.current) {
      mapRef.current.flyTo(vehicle.coordinates, 17, { duration: 0.6 });
    }
  }, [onTabChange, showPanel]);

  const focusOnAllLiveVehicles = useCallback(() => {
    if (!mapRef.current || filteredLiveVehicles.length === 0) return;
    setLiveDisplayMode("fleet");
    setHistoryPlaybackPlaying(false);
    setSelectedEventItem(null);
    const bounds = L.latLngBounds(filteredLiveVehicles.map((vehicle) => vehicle.coordinates as [number, number]));
    scheduleMapFitBounds(() => mapRef.current, bounds, { padding: [36, 36], maxZoom: 16 }, 50);
  }, [filteredLiveVehicles]);

  const jumpToHistoryPoint = useCallback((index: number) => {
    if (!historyTrack?.points?.length) return;
    const safeIndex = Math.max(0, Math.min(index, historyTrack.points.length - 1));
    const point = historyTrack.points[safeIndex];
    setHistoryPlaybackPlaying(false);
    setHistoryPlaybackIndex(safeIndex);
    if (mapRef.current) {
      mapRef.current.flyTo([point.lat, point.lng], 17, { duration: 0.5 });
    }
  }, [historyTrack]);

  const clearHistoryTrack = useCallback(() => {
    setHistoryTrack(null);
    setHistoryVehicleId(null);
    setHistoryError(null);
    setLiveDisplayMode("fleet");
    setHistoryPlaybackIndex(0);
    setHistoryPlaybackPlaying(false);
    setEnhancedTrackGeometry(null);
    setEnhancedTrackMode("raw");
  }, []);

  const loadEnhancedTrack = useCallback(async () => {
    if (!historyTrack?.points?.length || !historyTrack.vehicle.id) return;

    setEnhancedTrackLoading(true);
    try {
      const payload = {
        points: historyTrack.points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          timestamp: p.recordedAt || null,
          accuracy: p.accuracy ?? null,
        })),
      };

      const response = await fetch(
        `/api/vehicles/${encodeURIComponent(historyTrack.vehicle.id)}/match-track`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.geometry?.coordinates?.length) {
        setEnhancedTrackGeometry(null);
        setEnhancedTrackMode("raw");
        return;
      }

      setEnhancedTrackGeometry(data.geometry);
      setEnhancedTrackMode("both");
    } catch {
      setEnhancedTrackGeometry(null);
      setEnhancedTrackMode("raw");
    } finally {
      setEnhancedTrackLoading(false);
    }
  }, [historyTrack]);

  const loadVehicleHistory = useCallback(async (vehicle: LiveVehicle) => {
    if (!municipality?._id) {
      setHistoryError("تعذر تحديد الفرع لتحميل سجل الحركة.");
      return;
    }

    const fromDate = new Date(historyFrom);
    const toDate = new Date(historyTo);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setHistoryError("الرجاء إدخال فترة زمنية صحيحة.");
      return;
    }

    if (fromDate.getTime() > toDate.getTime()) {
      setHistoryError("وقت البداية يجب أن يسبق وقت النهاية.");
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryVehicleId(vehicle.id);

    try {
      const searchParams = new URLSearchParams({
        branchId: municipality._id,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        limit: "1500",
      });
      const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}/history?${searchParams.toString()}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل سجل الحركة.");
      }

      const nextHistory = payload?.history as VehicleHistoryTrack | undefined;
      if (!nextHistory?.points?.length) {
        setHistoryTrack(null);
        setLiveDisplayMode("fleet");
        setHistoryPlaybackIndex(0);
        setHistoryPlaybackPlaying(false);
        setHistoryError("لا توجد نقاط محفوظة ضمن الفترة الزمنية المحددة.");
      } else {
        setHistoryTrack(nextHistory);
        setLiveDisplayMode("history");
        setHistoryPlaybackIndex(0);
        setHistoryPlaybackPlaying(false);
        onTabChange("live");
        showPanel("live");
      }
    } catch (error: any) {
      setHistoryTrack(null);
      setLiveDisplayMode("fleet");
      setHistoryPlaybackIndex(0);
      setHistoryPlaybackPlaying(false);
      setHistoryError(error?.message || "تعذر تحميل سجل الحركة.");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFrom, historyTo, municipality?._id, onTabChange, showPanel]);

  useEffect(() => {
    if (!trackingObjectId || !mapRef.current) return;
    const obj = atharObjects.find((o) => String(o.id) === String(trackingObjectId));
    if (!obj || obj.lat == null || obj.lng == null) {
      setTrackingObjectId(null);
      trackingLastPosRef.current = null;
      return;
    }
    const lat = Number(obj.lat);
    const lng = Number(obj.lng);
    const last = trackingLastPosRef.current;
    if (!last || last.lat !== lat || last.lng !== lng) {
      trackingLastPosRef.current = { lat, lng };
      mapRef.current.panTo([lat, lng], { animate: true });
    }
  }, [trackingObjectId, atharObjects]);

  useEffect(() => {
    if (!isHistoryViewMode || !historyTrack?.points?.length) return;
    const bounds = L.latLngBounds(
      historyTrack.points.map((point) => [point.lat, point.lng] as [number, number])
    );
    return scheduleMapFitBounds(
      () => mapRef.current,
      bounds,
      { padding: [40, 40], maxZoom: 17 },
      100
    );
  }, [historyTrack, isHistoryViewMode]);

  useEffect(() => {
    if (!isHistoryViewMode || !historyPlaybackPlaying || !historyTrack?.points?.length) return;
    if (historyPlaybackIndex >= historyTrack.points.length - 1) {
      setHistoryPlaybackPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setHistoryPlaybackIndex((current) => {
        if (!historyTrack?.points?.length) return 0;
        const next = Math.min(current + 1, historyTrack.points.length - 1);
        if (next >= historyTrack.points.length - 1) {
          setHistoryPlaybackPlaying(false);
        }
        return next;
      });
    }, historyPlaybackSpeedMs);

      return () => window.clearTimeout(timer);
  }, [historyPlaybackIndex, historyPlaybackPlaying, historyPlaybackSpeedMs, historyTrack, isHistoryViewMode]);

  useEffect(() => {
    if (!mapRef.current || !isHistoryViewMode || !currentPlaybackPoint || !historyPlaybackPlaying) return;
    mapRef.current.panTo([currentPlaybackPoint.lat, currentPlaybackPoint.lng], { animate: true });
  }, [currentPlaybackPoint, historyPlaybackPlaying, isHistoryViewMode]);

  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
    }
    if (activeTab === "live" && filteredLiveVehicles.length > 0) {
      return filteredLiveVehicles[0].coordinates as [number, number];
    }
    if (activeTab === "live" && visibleLiveVehicles.length > 0) {
      return visibleLiveVehicles[0].coordinates as [number, number];
    }
    if (activeTab === "points") {
      if (points.length > 0) return [points[0].lat, points[0].lng] as [number, number];
      if (atharMarkers.length > 0) return [atharMarkers[0].lat, atharMarkers[0].lng] as [number, number];
    }
    if (activeTab === "zones" && zones.length > 0 && zones[0].center) {
      return [zones[0].center.lat, zones[0].center.lng] as [number, number];
    }
    if (activeTab === "objects") {
      const objectWithCoords = atharObjects.find((o) => o.lat !== null && o.lng !== null);
      if (objectWithCoords) return [Number(objectWithCoords.lat), Number(objectWithCoords.lng)] as [number, number];
    }
    return defaultCenter;
  }, [municipality, activeTab, filteredLiveVehicles, visibleLiveVehicles, points, atharMarkers, zones, atharObjects]);

  const mapKey = `map-${municipality?.name ?? "default"}`;
  const initialCenter = center;

  const liveMarkersLayer = useMemo(() => {
    if (activeTab !== "live") return null;
    return filteredLiveVehicles.map((vehicle) => {
      if (isHistoryViewMode && historyTrack?.vehicle.id === vehicle.id) return null;
      const matchedObject = vehicle.imei ? objectByImei.get(vehicle.imei) : null;
      return (
        <Marker
          key={`${vehicle.id}-${showVehicleNamesOnMap ? "label" : "nolabel"}`}
          position={vehicle.coordinates as [number, number]}
          icon={getLiveVehicleIcon(vehicle, showVehicleNamesOnMap ? vehicle.busNumber : undefined)}
        >
          <Popup>
            <div className="text-right space-y-1 max-w-[300px]">
              <div className="font-semibold">{vehicle.vehicleName || vehicle.busNumber}</div>
              {vehicle.plateNumber && <div className="text-xs text-muted-foreground">اللوحة: {vehicle.plateNumber}</div>}
              <div className="text-xs text-muted-foreground">المصدر: {vehicle.providerLabel}</div>
              <div className="text-xs text-muted-foreground">السائق: {vehicle.driverName}</div>
              <div className="text-xs text-muted-foreground">المسار التشغيلي: {vehicle.route || "-"}</div>
              <div className="text-xs text-muted-foreground">الحالة: {statusLabel[vehicle.status]}</div>
              <div className="text-xs text-muted-foreground">السرعة: {vehicle.speed} كم/س</div>
              <div className="text-xs text-muted-foreground">الاتجاه: {Math.round(vehicle.heading || 0)}°</div>
              {vehicle.accuracy != null && <div className="text-xs text-muted-foreground">الدقة: {vehicle.accuracy} م</div>}
              <div className="text-xs text-muted-foreground">المنطقة: {vehicleZoneMap.get(vehicle.id) || "غير معروفة"}</div>
              <div className="text-xs text-muted-foreground">آخر تحديث: {vehicle.lastUpdate}</div>
              {vehicle.lastRecordedAt && <div className="text-xs text-muted-foreground">وقت التسجيل: {vehicle.lastRecordedAt}</div>}
              {vehicle.lastReceivedAt && <div className="text-xs text-muted-foreground">وقت الاستقبال: {vehicle.lastReceivedAt}</div>}
              {vehicle.trackingExternalId && <div className="text-xs text-muted-foreground">معرّف التتبع: {vehicle.trackingExternalId}</div>}
              {vehicle.deviceName && <div className="text-xs text-muted-foreground">الجهاز: {vehicle.deviceName}</div>}
              {vehicle.platform && <div className="text-xs text-muted-foreground">المنصة: {vehicle.platform}</div>}
              {vehicle.appVersion && <div className="text-xs text-muted-foreground">إصدار التطبيق: {vehicle.appVersion}</div>}
              {vehicle.imei && <div className="text-xs text-muted-foreground">IMEI: {vehicle.imei}</div>}
              {matchedObject && (
                <>
                  <div className="mt-2 border-t pt-2 text-xs font-medium">تفاصيل أثر الخام</div>
                  <div className="text-xs text-muted-foreground">الاسم: {matchedObject.name || "-"}</div>
                  <div className="text-xs text-muted-foreground">اللوحة: {matchedObject.plateNumber || "-"}</div>
                  <div className="text-xs text-muted-foreground">الجهاز: {matchedObject.device || "-"}</div>
                  <div className="text-xs text-muted-foreground">الموديل: {matchedObject.model || "-"}</div>
                  <div className="text-xs text-muted-foreground">وقت جهاز التتبع: {matchedObject.dtTracker || "-"}</div>
                  <div className="text-xs text-muted-foreground">وقت الخادم: {matchedObject.dtServer || "-"}</div>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [activeTab, filteredLiveVehicles, historyTrack?.vehicle.id, isHistoryViewMode, objectByImei, vehicleZoneMap, showVehicleNamesOnMap]);

  const showRawTrail = enhancedTrackMode === "raw" || enhancedTrackMode === "both";
  const showEnhancedTrail = enhancedTrackGeometry && (enhancedTrackMode === "enhanced" || enhancedTrackMode === "both");

  const historyPathLayer = useMemo(() => {
    if (!isHistoryViewMode || !historyTrack?.points?.length) return null;
    const positions = historyTrack.points.map((point) => [point.lat, point.lng] as [number, number]);
    const playedPositions = historyTrack.points
      .slice(0, Math.max(1, historyPlaybackIndex + 1))
      .map((point) => [point.lat, point.lng] as [number, number]);
    const startPoint = historyTrack.points[0];
    const endPoint = historyTrack.points[historyTrack.points.length - 1];
    const currentPoint = currentPlaybackPoint;
    const historyTrackColor = "#16a34a";

    return (
      <>
        {showRawTrail ? (
          <>
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#052e16",
                weight: 10,
                opacity: 0.18,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={positions}
              pathOptions={{
                color: historyTrackColor,
                weight: 6,
                opacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={playedPositions}
              pathOptions={{
                color: "#22c55e",
                weight: 8,
                opacity: 0.96,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        ) : null}
        {startPoint ? (
          <Marker
            position={[startPoint.lat, startPoint.lng]}
            icon={getDefaultPointIcon("بداية")}
            zIndexOffset={1100}
          >
            <Popup>
              <div className="text-right">
                <div className="font-semibold">بداية سجل الحركة</div>
                <div className="text-xs text-muted-foreground">{startPoint.recordedAt}</div>
              </div>
            </Popup>
          </Marker>
        ) : null}
        {currentPoint ? (
          <Marker
            position={[currentPoint.lat, currentPoint.lng]}
            icon={getLiveVehicleIcon(
              {
                id: historyTrack.vehicle.id,
                provider: historyTrack.vehicle.provider,
                providerLabel: historyTrack.vehicle.providerLabel,
                vehicleName: historyTrack.vehicle.name,
                plateNumber: historyTrack.vehicle.plateNumber,
                busNumber: historyTrack.vehicle.plateNumber || historyTrack.vehicle.name,
                driverName: "",
                route: historyTrack.vehicle.routeName || "",
                routeId: historyTrack.vehicle.routeId,
                status: "moving",
                lastUpdate: currentPoint.recordedAt,
                lastReceivedAt: currentPoint.recordedAt,
                lastRecordedAt: currentPoint.recordedAt,
                speed: currentPoint.speed || 0,
                heading: currentPoint.heading || 0,
                accuracy: currentPoint.accuracy,
                coordinates: [currentPoint.lat, currentPoint.lng],
                imei: historyTrack.vehicle.imei || undefined,
                trackingExternalId: historyTrack.vehicle.trackingExternalId,
                deviceName: null,
                platform: null,
                appVersion: null,
              },
              "موضع الحركة"
            )}
            zIndexOffset={1300}
          >
            <Popup>
              <div className="text-right">
                <div className="font-semibold">موضع الحركة الحالي</div>
                <div className="text-xs text-muted-foreground">الوقت: {currentPoint.recordedAt}</div>
                <div className="text-xs text-muted-foreground">السرعة: {currentPoint.speed != null ? `${currentPoint.speed} كم/س` : "—"}</div>
              </div>
            </Popup>
          </Marker>
        ) : null}
        {endPoint ? (
          <Marker
            position={[endPoint.lat, endPoint.lng]}
            icon={getDefaultPointIcon("نهاية")}
            zIndexOffset={1200}
          >
            <Popup>
              <div className="text-right">
                <div className="font-semibold">نهاية سجل الحركة</div>
                <div className="text-xs text-muted-foreground">{endPoint.recordedAt}</div>
              </div>
            </Popup>
          </Marker>
        ) : null}
      </>
    );
  }, [currentPlaybackPoint, historyPlaybackIndex, historyTrack, isHistoryViewMode, showRawTrail]);

  const enhancedPathLayer = useMemo(() => {
    if (!isHistoryViewMode || !showEnhancedTrail || !enhancedTrackGeometry?.coordinates?.length) return null;
    const positions = enhancedTrackGeometry.coordinates.map(
      (coord) => [coord[1], coord[0]] as [number, number]
    );

    return (
      <Polyline
        positions={positions}
        smoothFactor={2}
        pathOptions={{
          color: "#2563eb",
          weight: 5,
          opacity: 0.92,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    );
  }, [enhancedTrackGeometry, isHistoryViewMode, showEnhancedTrail]);

  const pointsMarkersLayer = useMemo(() => {
    if (activeTab !== "points") return null;
    const filtered = pointTypeFilter ? points.filter((p) => p.type === pointTypeFilter) : points;
    return filtered.map((point) => {
      const pointId = point._id != null ? String(point._id) : `${point.lat}-${point.lng}`;
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      const radius = Number(point.radiusMeters) || 500;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return (
        <Marker
          key={pointId}
          position={[lat, lng]}
          icon={getDefaultPointIcon(showVehicleNamesOnMap ? (point.nameAr || point.name || "نقطة") : undefined)}
          eventHandlers={{
            click: () => focusOnPoint(point),
          }}
        >
          <Popup>
            <div className="text-right">
              <div className="font-semibold">{point.nameAr || point.name || "نقطة"}</div>
              <div className="text-xs text-muted-foreground">
                {pointTypeLabels[point.type || ""] || point.type || "نقطة"}
              </div>
              <div className="text-xs text-muted-foreground">نصف القطر: {radius} م</div>
              <div className="text-xs text-muted-foreground mt-1">اضغط للتوسع في التفاصيل</div>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [activeTab, points, pointTypeFilter, showVehicleNamesOnMap, focusOnPoint]);

  const atharMarkersLayer = useMemo(() => {
    if (activeTab !== "points") return null;
    return atharMarkers.map((marker) => {
      const lat = Number(marker.lat);
      const lng = Number(marker.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = showVehicleNamesOnMap ? (marker.name || `نقطة أثر ${marker.id}`) : undefined;
      const customIcon = getAtharMarkerIcon(marker.icon, label);
      return (
        <Marker
          key={`marker-${marker.id}`}
          position={[lat, lng]}
          icon={customIcon}
        >
          <Popup>
            <div className="text-right">
              <div className="font-semibold">{marker.name || `نقطة أثر ${marker.id}`}</div>
              <div className="text-xs text-muted-foreground">نقطة من أثر</div>
              <div className="text-xs text-muted-foreground mt-1">اضغط للتوسع في التفاصيل</div>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [activeTab, atharMarkers, showVehicleNamesOnMap]);

  const renderMap = (heightClass: string, attachRef = false) => (
    <div className={`${heightClass} w-full overflow-hidden rounded-2xl border bg-background relative`}>
      <nav className="absolute top-0 right-0 left-0 z-[1000] flex flex-wrap items-center justify-start gap-2 rounded-t-2xl border-b border-border/50 bg-background/95 px-3 py-2 backdrop-blur-sm" dir="rtl">
        <div className="flex flex-wrap items-center gap-2" dir="rtl">
          <Button
            type="button"
            variant={rightPanel === "system-points" ? "default" : "secondary"}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => togglePanel("system-points")}
          >
            <MapPin className="h-3.5 w-3.5" />
            نقاط النظام مع المناطق المرتبطة فيها
          </Button>
          <Button
            type="button"
            variant={rightPanel === "live" ? "default" : "secondary"}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => togglePanel("live")}
          >
            <BusFront className="h-3.5 w-3.5" />
            تتبع حي
          </Button>
          <Button
            type="button"
            variant={rightPanel === "events" ? "default" : "secondary"}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => togglePanel("events")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {eventsLabel}
          </Button>
        </div>
      </nav>
      <MapContainer
        key={mapKey}
        center={initialCenter}
        zoom={13}
        className="h-full w-full"
        preferCanvas
        zoomAnimation={false}
        markerZoomAnimation={false}
        fadeAnimation={false}
        ref={attachRef ? mapRef : undefined}
        whenReady={() => {
          if (!attachRef) return;
          window.setTimeout(() => mapRef.current?.invalidateSize(), 100);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {municipality && (
          <Marker position={[municipality.centerLat, municipality.centerLng]}>
            <Popup>
              <div className="text-right">
                <div className="font-semibold">{municipality.name}</div>
                {municipality.addressText && (
                  <div className="text-sm text-muted-foreground">{municipality.addressText}</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {activeTab === "live" ? (
          <MarkerClusterGroup
            disableClusteringAtZoom={17}
            showCoverageOnHover={false}
            animate={false}
            animateAddingMarkers={false}
            removeOutsideVisibleBounds={true}
            chunkedLoading={true}
            maxClusterRadius={70}
            spiderfyOnMaxZoom={false}
            zoomToBoundsOnClick={true}
          >
            {liveMarkersLayer}
          </MarkerClusterGroup>
        ) : (
          liveMarkersLayer
        )}
        {enhancedPathLayer}
        {historyPathLayer}

        <MarkerClusterGroup
          disableClusteringAtZoom={17}
          showCoverageOnHover={false}
          animate={false}
          animateAddingMarkers={false}
          removeOutsideVisibleBounds={true}
          chunkedLoading={false}
          maxClusterRadius={80}
          spiderfyOnMaxZoom={false}
          zoomToBoundsOnClick={true}
        >
          {pointsMarkersLayer}
          {atharMarkersLayer}
        </MarkerClusterGroup>

        {(activeTab === "zones" || (activeTab === "points" && showZonesWithPoints)) &&
          zones.slice(0, layersVisibleLimit).map((zone) => {
            const positions = zone.vertices.map((v) => [v.lat, v.lng]) as Array<[number, number]>;
            if (positions.length < 3) return null;
            const color = zone.color || "#f59e0b";
            return (
              <Polygon
                key={`zone-${zone.id}`}
                positions={positions}
                pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.12 }}
                eventHandlers={{ click: () => setSelectedZone(zone) }}
              >
                <Popup>
                  <div className="text-right">
                    <div className="font-semibold">{zone.name}</div>
                    <div className="text-xs text-muted-foreground">منطقة من أثر</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {activeTab === "objects" &&
          atharObjects
            .filter((obj) => obj.lat !== null && obj.lng !== null)
            .slice(0, layersVisibleLimit)
            .map((obj) => (
              <Marker
                key={`obj-${obj.id}-${showVehicleNamesOnMap ? "label" : "nolabel"}`}
                position={[Number(obj.lat), Number(obj.lng)]}
                icon={getBusIcon(
                  obj.active ? "moving" : "stopped",
                  obj.angle,
                  showVehicleNamesOnMap ? (obj.name || obj.plateNumber || obj.imei || `سيارة ${obj.id}`) : undefined,
                )}
                eventHandlers={{
                  click: () => {
                    setSelectedObjectId(String(obj.id));
                    showPanel("athar-live");
                  },
                }}
              >
                <Popup>
                  <div className="text-right space-y-1 max-w-[300px]">
                    <div className="font-semibold">{obj.name}</div>
                    {obj.plateNumber && <div className="text-xs text-muted-foreground">اللوحة: {obj.plateNumber}</div>}
                    <div className="text-xs text-muted-foreground">IMEI: {obj.imei || "-"}</div>
                    <div className="text-xs text-muted-foreground">الحالة: {obj.active ? "تعمل" : "متوقفة"}</div>
                    <div className="text-xs text-muted-foreground">السرعة: {obj.speed} كم/س</div>
                    <div className="text-xs text-muted-foreground">الاتجاه: {Math.round(obj.angle || 0)}°</div>
                    {obj.dtTracker && <div className="text-xs text-muted-foreground">وقت الجهاز: {obj.dtTracker}</div>}
                    {obj.dtServer && <div className="text-xs text-muted-foreground">وقت الخادم: {obj.dtServer}</div>}
                    {obj.model && <div className="text-xs text-muted-foreground">الموديل: {obj.model}</div>}
                    {obj.device && <div className="text-xs text-muted-foreground">الجهاز: {obj.device}</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );

  const renderTabSwitcher = (className = "w-full max-w-xl") => (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as MapTab)}
      dir="rtl"
      className={className}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="live" className="gap-1.5">
          <BusFront className="h-4 w-4" />
          تتبع حي
        </TabsTrigger>
        <TabsTrigger value="points" className="gap-1.5">
          <MapPin className="h-4 w-4" />
          نقاط أثر
        </TabsTrigger>
        <TabsTrigger value="zones" className="gap-1.5">
          <Hexagon className="h-4 w-4" />
          مناطق أثر
        </TabsTrigger>
      </TabsList>
      <TabsContent value="live" className="hidden" />
      <TabsContent value="points" className="hidden" />
      <TabsContent value="zones" className="hidden" />
      <TabsContent value="objects" className="hidden" />
    </Tabs>
  );

  const openRightPanel = (panel: RightPanelType) => {
    setRightPanel((p) => (p === panel ? null : panel));
    if (panel === "cars" || panel === "athar-live") onTabChange("objects");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setFullscreenOpen(true)}>
          <Maximize2 className="h-4 w-4" />
          عرض كامل
        </Button>
      </div>

      <div className="relative flex w-full flex-row overflow-hidden rounded-2xl border bg-card" dir="ltr" style={{ minHeight: "520px" }}>
        <div className="relative min-w-0 flex-1">
          {renderMap("h-[820px] min-h-[820px]", true)}
          {(currentTabLoading || historyLoading || enhancedTrackLoading) && (
            <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
              <LoadingOverlay />
              {historyLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحميل سجل الحركة...</p>}
              {enhancedTrackLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحسين المسار عبر OSRM...</p>}
            </div>
          )}
        </div>

        {rightPanel ? (
          <aside className="flex h-[820px] w-[360px] max-w-[40vw] flex-shrink-0 flex-col border-l bg-background" dir="rtl">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-right text-sm font-medium">
                {rightPanel === "athar-live" && "أجهزة أثر الخام"}
                {rightPanel === "system-points" && "نقاط النظام مع المناطق المرتبطة فيها"}
                {rightPanel === "live" && "تتبع حي"}
                {rightPanel === "events" && eventsLabel}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setRightPanel(null)} title="إغلاق">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-right">
              {rightPanel === "athar-live" && (
                <>
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="بحث بالاسم أو اللوحة أو IMEI..."
                        value={atharCarsSearchQuery}
                        onChange={(e) => setAtharCarsSearchQuery(e.target.value)}
                        className="h-8 pr-8 text-xs"
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      إجمالي: {atharObjects.length}
                      {atharCarsSearchQuery.trim() && ` • عرض: ${filteredAtharObjects.length}`}
                    </div>
                  </div>
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {filteredAtharObjects.map((obj) => {
                      const isSelected = String(obj.id) === String(selectedObjectId);
                      return (
                        <button
                          key={`obj-row-${obj.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedObjectId(String(obj.id));
                            focusOnObject(obj);
                          }}
                          className={`w-full rounded-md border px-2 py-2 text-xs transition ${
                            isSelected ? "border-primary/40 bg-primary/10" : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {obj.name} {obj.plateNumber ? `(${obj.plateNumber})` : ""}
                            </span>
                            <span className="text-muted-foreground">
                              {obj.lat != null && obj.lng != null ? `${obj.lat.toFixed(5)}, ${obj.lng.toFixed(5)}` : "بدون موقع"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredAtharObjects.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        {atharObjects.length === 0 ? "لا توجد سيارات قادمة من أثر حالياً." : "لا توجد نتائج للبحث."}
                      </div>
                    )}
                  </div>
                  {selectedObject ? (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            selectedObject?.active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-600"
                          }`}
                        >
                          {selectedObject?.active ? "نشطة" : "غير نشطة"}
                        </span>
                        <div className="font-semibold">{selectedObject?.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div>اللوحة: {selectedObject?.plateNumber || "-"}</div>
                        <div>IMEI: {selectedObject?.imei || "-"}</div>
                        <div>السرعة: {selectedObject?.speed ?? 0} كم/س</div>
                        <div>الاتجاه: {Math.round(selectedObject?.angle || 0)}°</div>
                        <div>وقت الجهاز: {selectedObject?.dtTracker || "-"}</div>
                        <div>وقت الخادم: {selectedObject?.dtServer || "-"}</div>
                      </div>
                      {matchedVehicle && (
                        <div className="text-xs text-muted-foreground">المركبة بالنظام: {matchedVehicle?.name}</div>
                      )}
                      {matchedRoute && (
                        <div className="text-xs text-muted-foreground">المسار التشغيلي: {matchedRoute?.name}</div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" className="h-8" onClick={() => focusOnObject(selectedObject)} disabled={selectedObject?.lat == null || selectedObject?.lng == null}>
                          تحديد على الخريطة
                        </Button>
                        {matchedVehicle?.routeId ? (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/routes/${String(matchedVehicle?.routeId)}/points`}>عرض المسار التشغيلي</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" disabled>عرض المسار التشغيلي</Button>
                        )}
                        {matchedVehicle?._id ? (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/reports?vehicleId=${matchedVehicle?._id}`}>تقارير المركبة</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" disabled>تقارير المركبة</Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    filteredAtharObjects.length > 0 && <div className="mt-4 text-xs text-muted-foreground">اختر سيارة لعرض التفاصيل.</div>
                  )}
                </>
              )}

              {rightPanel === "system-points" && (
                <>
                  {onToggleMapView && (
                    <Button variant="outline" size="sm" className="mb-3 w-full" onClick={onToggleMapView}>
                      {showZonesWithPoints ? "عرض النقاط فقط" : "عرض النقاط والمناطق"}
                    </Button>
                  )}
                  <div className="mb-2 space-y-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="بحث في النقاط..."
                        value={pointPanelSearch}
                        onChange={(e) => setPointPanelSearch(e.target.value)}
                        className="h-8 pr-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[null, "container", "station", "facility", "other"].map((type) => (
                        <button
                          key={type ?? "all"}
                          type="button"
                          onClick={() => setPointTypeFilter(type)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                            pointTypeFilter === type
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {type === null ? "الكل" : pointTypeLabels[type] || type}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pointTypeFilter || pointPanelSearch
                        ? `عرض: ${points.filter((p) => (!pointTypeFilter || p.type === pointTypeFilter) && (!pointPanelSearch || `${p.name || ""} ${p.nameAr || ""}`.toLowerCase().includes(pointPanelSearch.toLowerCase()))).length} من ${points.length}`
                        : `نقاط النظام: ${points.length}`}
                    </div>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {points
                      .filter((p) =>
                        (!pointTypeFilter || p.type === pointTypeFilter) &&
                        (!pointPanelSearch || `${p.name || ""} ${p.nameAr || ""}`.toLowerCase().includes(pointPanelSearch.toLowerCase()))
                      )
                      .slice(0, layersVisibleLimit)
                      .map((point) => {
                      const pointId = String(point._id);
                      const isSelected = selectedPoint != null && String(selectedPoint?._id) === pointId;
                      const zoneName = zoneNameById.get(normalizeZoneId(point.zoneId)) || "غير مرتبطة بمنطقة";
                      return (
                        <button
                          key={pointId}
                          type="button"
                          onClick={() => focusOnPoint(point)}
                          className={`w-full rounded-md border px-2 py-2 text-xs transition ${
                            isSelected ? "border-primary/40 bg-primary/10" : "hover:bg-muted"
                          }`}
                        >
                          <div className="space-y-1 text-right">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{point.nameAr || point.name || "نقطة نظام"}</span>
                              <span className="text-muted-foreground">
                                {Number(point.lat).toFixed(5)}, {Number(point.lng).toFixed(5)}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">المنطقة المرتبطة: {zoneName}</div>
                          </div>
                        </button>
                      );
                    })}
                    {points.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        <MapPin className="mx-auto mb-1 h-6 w-6 opacity-30" />
                        لا توجد نقاط نظام مسجلة لهذا الفرع.
                      </div>
                    )}
                    {points.length > 0 && pointTypeFilter && points.filter((p) => p.type === pointTypeFilter).length === 0 && (
                      <div className="py-3 text-center text-xs text-muted-foreground">لا توجد نقاط من نوع &quot;{pointTypeLabels[pointTypeFilter] || pointTypeFilter}&quot;.</div>
                    )}
                  </div>
                  {selectedPoint ? (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      {eventDetailsForPoint && focusPointId && String(selectedPoint?._id) === String(focusPointId) && (
                        <>
                          <div className="text-xs font-semibold text-muted-foreground">الحدث المحدد</div>
                          <div className="space-y-1 rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                            <div>{eventDetailsForPoint?.displayText || "—"}</div>
                            <div>الوقت: {eventDetailsForPoint?.eventTimestamp || "—"}</div>
                            <div>المركبة: {eventDetailsForPoint?.vehicleName || "—"}</div>
                            <div>
                              النوع:{" "}
                              {eventDetailsForPoint?.type === "zone_in"
                                ? "دخول"
                                : eventDetailsForPoint?.type === "zone_out"
                                  ? "خروج"
                                  : eventDetailsForPoint?.type || "—"}
                            </div>
                            {eventDetailsForPoint?.driverName && <div>السائق: {eventDetailsForPoint?.driverName}</div>}
                          </div>
                        </>
                      )}
                      <div className="font-semibold">{selectedPoint?.nameAr || selectedPoint?.name || "نقطة"}</div>
                      <div className="grid gap-2 text-[11px] text-muted-foreground">
                        <div>النوع: {pointTypeLabels[selectedPoint?.type || ""] || selectedPoint?.type || "—"}</div>
                        <div>المنطقة المرتبطة: {zoneNameById.get(normalizeZoneId(selectedPoint?.zoneId)) || "غير مرتبطة بمنطقة"}</div>
                        {selectedPoint?.zoneId && <div>معرف المنطقة: {selectedPoint?.zoneId}</div>}
                        <div>خط العرض: {Number(selectedPoint?.lat).toFixed(6)}</div>
                        <div>خط الطول: {Number(selectedPoint?.lng).toFixed(6)}</div>
                        <div>نصف القطر: {Number(selectedPoint?.radiusMeters) || 500} م</div>
                        {selectedPoint?.addressText && <div>العنوان: {selectedPoint?.addressText}</div>}
                        <div>المعرف: {String(selectedPoint?._id)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-muted-foreground">اختر نقطة نظام لعرض التفاصيل.</div>
                  )}
                </>
              )}

              {rightPanel === "live" && (
                <div className="flex h-full flex-col gap-2 text-sm">
                  {/* ── Top bar: KPI + action buttons ── */}
                  <div className="flex items-center gap-1.5">
                    {/* KPI dots */}
                    <div className="flex flex-1 items-center gap-2 text-[11px] tabular-nums">
                      <span className="font-semibold">{liveVehicleInventory.length}</span>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">{liveStatusCounts.moving}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">{liveStatusCounts.stopped}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span className="text-muted-foreground">{liveStatusCounts.offline}</span>
                      </span>
                      {(liveProviderFilter !== "all" || liveStatusFilter !== "all") && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">فلتر</span>
                      )}
                      {historyTrack && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">سجل</span>
                      )}
                    </div>
                    {/* Filters dialog trigger */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" title="الفلاتر والإعدادات">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm" dir="rtl">
                        <DialogHeader>
                          <DialogTitle className="text-sm">فلاتر التتبع الحي</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-1">
                          {trackingSource !== "all" ? (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                              {`مساحة ${trackingSourceLabel || liveProviderFilterLabels[trackingSource]} فقط`}
                            </div>
                          ) : null}

                          {fixedLiveProviderFilter === "all" ? (
                            <div className="space-y-2">
                              <span className="text-xs font-medium text-muted-foreground">المصدر</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(["all", "athar", "mobile_app", "traccar"] as const).map((provider) => (
                                  <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setLiveProviderFilter(provider)}
                                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                      liveProviderFilter === provider ? "font-semibold shadow-sm" : "text-muted-foreground hover:bg-muted"
                                    }`}
                                    style={
                                      liveProviderFilter === provider
                                        ? provider === "all"
                                          ? { borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted))" }
                                          : { borderColor: getLiveProviderColor(provider), backgroundColor: `${getLiveProviderColor(provider)}18`, color: getLiveProviderColor(provider) }
                                        : undefined
                                    }
                                  >
                                    {liveProviderFilterLabels[provider]} {provider === "all" ? liveVehicleInventory.length : liveProviderCounts[provider]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <span className="text-xs font-medium text-muted-foreground">الحالة</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(["all", "moving", "stopped", "offline"] as const).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setLiveStatusFilter(status)}
                                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                    liveStatusFilter === status
                                      ? status === "moving"
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                                        : status === "stopped"
                                          ? "border-amber-500 bg-amber-500/10 text-amber-700"
                                          : status === "offline"
                                            ? "border-slate-400 bg-slate-500/10 text-slate-600"
                                            : "border-primary bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {liveStatusFilterLabels[status]} {status === "all" ? liveVehicleInventory.length : liveStatusCounts[status]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">أسماء المركبات على الخريطة</span>
                            <button
                              type="button"
                              onClick={() => setShowVehicleNamesOnMap((current) => !current)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                showVehicleNamesOnMap ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {showVehicleNamesOnMap ? "مفعّل" : "مخفي"}
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={focusOnAllLiveVehicles}
                            disabled={filteredLiveVehicles.length === 0}
                          >
                            تركيز على النتائج المرئية
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* History dialog trigger */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 flex-shrink-0 ${historyTrack ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                          title="سجل الحركة"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" dir="rtl">
                        <DialogHeader>
                          <DialogTitle className="text-sm">سجل حركة المركبة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-1">
                          {historyTrack ? (
                            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-[11px]">
                              <div>
                                <span className="font-medium">{historyTrack.vehicle.name}</span>
                                <span className="mr-1 text-muted-foreground">· {historyTrack.summary.pointsCount} نقطة</span>
                                {!isHistoryViewMode ? <span className="mr-1 text-amber-600"> · مخفي</span> : null}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isHistoryViewMode ? "default" : "secondary"}
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => { setLiveDisplayMode("history"); onTabChange("live"); showPanel("live"); }}
                                  disabled={historyLoading}
                                >
                                  {isHistoryViewMode ? "معروض" : "إظهار"}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-muted-foreground" onClick={clearHistoryTrack}>
                                  مسح
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">اختر مركبة من القائمة ثم اضغط "سجل الحركة" لتحميل النقاط.</p>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] text-muted-foreground">من</label>
                              <Input type="datetime-local" step={60} value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-muted-foreground">إلى</label>
                              <Input type="datetime-local" step={60} value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="h-8 text-xs" />
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => activeHistoryVehicle && void loadVehicleHistory(activeHistoryVehicle)}
                            disabled={!activeHistoryVehicle || historyLoading}
                          >
                            {historyLoading ? "جارٍ التحميل..." : "تحميل / تحديث السجل"}
                          </Button>

                          {historyTrack?.points?.length ? (
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5 text-xs"
                                onClick={() => void loadEnhancedTrack()}
                                disabled={enhancedTrackLoading}
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                {enhancedTrackLoading ? "جارٍ التحسين..." : enhancedTrackGeometry ? "إعادة تحسين المسار" : "سجل الحركة المحسن"}
                              </Button>
                              {enhancedTrackGeometry ? (
                                <div className="flex items-center gap-1 rounded-lg border bg-muted/20 p-1">
                                  {([
                                    { key: "raw" as const, label: "خام" },
                                    { key: "enhanced" as const, label: "محسن" },
                                    { key: "both" as const, label: "كلاهما" },
                                  ]).map((opt) => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => setEnhancedTrackMode(opt.key)}
                                      className={`flex-1 rounded px-2 py-1 text-[11px] transition-colors ${
                                        enhancedTrackMode === opt.key
                                          ? "bg-background font-medium shadow-sm"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {historyError ? (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">{historyError}</div>
                          ) : null}

                          {historyTrack ? (
                            <>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border bg-muted/20 px-3 py-2 text-[11px]">
                                <span className="text-muted-foreground">المصدر</span>
                                <span>{historyTrack.summary.source === "athar_route" ? "أثر التاريخي" : "داخلي"}</span>
                                <span className="text-muted-foreground">المسار</span>
                                <span>{historyTrack.vehicle.routeName || "—"}</span>
                                <span className="text-muted-foreground">البداية</span>
                                <span className="tabular-nums">{historyTrack.summary.startedAt || "—"}</span>
                                <span className="text-muted-foreground">النهاية</span>
                                <span className="tabular-nums">{historyTrack.summary.endedAt || "—"}</span>
                              </div>

                              <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] tabular-nums text-muted-foreground">
                                    {Math.min(historyPlaybackIndex + 1, historyTrack.points.length)}/{historyTrack.points.length}
                                    {currentPlaybackPoint?.recordedAt ? ` · ${currentPlaybackPoint.recordedAt}` : ""}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpToHistoryPoint(0)} disabled={!historyTrack.points.length}>
                                      <SkipBack className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button type="button" size="icon" className="h-7 w-7" onClick={() => setHistoryPlaybackPlaying((c) => !c)} disabled={historyTrack.points.length <= 1}>
                                      {historyPlaybackPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpToHistoryPoint(historyTrack.points.length - 1)} disabled={!historyTrack.points.length}>
                                      <SkipForward className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-1">
                                  {[{ label: "بطيء", value: 1400 }, { label: "متوسط", value: 800 }, { label: "سريع", value: 400 }].map((s) => (
                                    <button
                                      key={s.value}
                                      type="button"
                                      onClick={() => setHistoryPlaybackSpeedMs(s.value)}
                                      className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${historyPlaybackSpeedMs === s.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-lg border">
                                {historyTrack.points.map((point, index) => (
                                  <button
                                    key={`${point.recordedAt}-${point.lat}-${point.lng}-${index}`}
                                    type="button"
                                    onClick={() => jumpToHistoryPoint(index)}
                                    className={`flex w-full items-center justify-between px-3 py-1.5 text-right text-[11px] transition-colors ${historyPlaybackIndex === index ? "bg-primary/5" : "hover:bg-muted/40"}`}
                                  >
                                    <span className="text-muted-foreground">{index + 1}</span>
                                    <div className="flex items-center gap-2 tabular-nums">
                                      <span className="text-muted-foreground">{point.speed != null ? `${point.speed} ك/س` : "—"}</span>
                                      <span>{point.recordedAt}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* ── Search ── */}
                  <div className="relative">
                    <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="بحث بالمركبة أو السائق أو المصدر..."
                      value={liveVehiclesSearchQuery}
                      onChange={(e) => setLiveVehiclesSearchQuery(e.target.value)}
                      className="h-8 pr-8 text-xs"
                    />
                  </div>

                  {/* ── Selected vehicle quick card ── */}
                  {selectedLiveVehicle ? (
                    <div className="rounded-xl border bg-card px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{selectedLiveVehicle.vehicleName || selectedLiveVehicle.busNumber}</div>
                          <div className="text-[11px] text-muted-foreground">{selectedLiveVehicle.providerLabel} · {statusLabel[selectedLiveVehicle.status]}</div>
                        </div>
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: getLiveProviderColor(selectedLiveVehicle.provider) }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Button size="sm" className="h-6 text-[11px]" onClick={() => focusOnLiveVehicle(selectedLiveVehicle)}>تركيز</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => void loadVehicleHistory(selectedLiveVehicle)}>سجل الحركة</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" asChild>
                          <Link href={getVehicleReportsHref(selectedLiveVehicle.id)}>الأحداث</Link>
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" asChild>
                          <Link href={getVehicleVisitLogHref(selectedLiveVehicle.id)}>الزيارات</Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[11px]" asChild>
                          <Link href={getVehicleGeneralReportHref(selectedLiveVehicle.id)}>التقرير</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* ── Vehicle list — fills remaining space ── */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {filteredLiveVehicles.map((vehicle) => (
                      <div
                        key={`live-vehicle-${vehicle.id}`}
                        className={`rounded-xl border px-3 py-2 text-right transition-colors hover:bg-muted/40 ${
                          historyTrack?.vehicle.id === vehicle.id ? "border-primary/50 bg-primary/5" : "bg-card"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                              vehicle.status === "moving"
                                ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]"
                                : vehicle.status === "stopped"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                            }`}
                          />
                          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                            <span className="truncate text-[12px] font-semibold">{vehicle.vehicleName || vehicle.busNumber}</span>
                            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: getLiveProviderColor(vehicle.provider) }} />
                          </div>
                        </div>
                        {/* Compact metadata grid */}
                        <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                          <span className="text-muted-foreground">المسار</span>
                          <span className="truncate text-left">{vehicle.route || "—"}</span>
                          <span className="text-muted-foreground">السائق</span>
                          <span className="truncate text-left">{vehicle.driverName || "—"}</span>
                          <span className="text-muted-foreground">السرعة</span>
                          <span className="tabular-nums text-left">{vehicle.speed} كم/س · {vehicle.lastUpdate}</span>
                          {vehicle.plateNumber ? (
                            <>
                              <span className="text-muted-foreground">اللوحة</span>
                              <span className="text-left">{vehicle.plateNumber}</span>
                            </>
                          ) : null}
                          <span className="text-muted-foreground">المنطقة</span>
                          <span className="truncate text-left">{vehicleZoneMap.get(vehicle.id) || "—"}</span>
                        </div>
                        {/* Actions */}
                        <div className="mt-1.5 flex gap-1">
                          <Button type="button" size="sm" className="h-6 text-[11px]" onClick={() => focusOnLiveVehicle(vehicle)}>
                            تحديد
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px]"
                            onClick={() => void loadVehicleHistory(vehicle)}
                            disabled={historyLoading && historyVehicleId === vehicle.id}
                          >
                            {historyLoading && historyVehicleId === vehicle.id ? "..." : "سجل"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredLiveVehicles.length === 0 && (
                      <div className="rounded-lg border border-dashed px-3 py-6 text-center text-[11px] text-muted-foreground">
                        لا توجد مركبات تطابق الفلاتر الحالية.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rightPanel === "events" && (
                <>
                  {eventDetailsForPoint && focusPointId && (
                    <div className="mb-3 space-y-1 rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      <div className="font-semibold text-foreground">الحدث المحدد</div>
                      <div>{eventDetailsForPoint?.displayText || "—"}</div>
                      <div>الوقت: {eventDetailsForPoint?.eventTimestamp || "—"}</div>
                      <div>المركبة: {eventDetailsForPoint?.vehicleName || "—"}</div>
                      {eventDetailsForPoint?.driverName && <div>السائق: {eventDetailsForPoint?.driverName}</div>}
                    </div>
                  )}
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="بحث بالأحداث أو المركبة أو النقطة..."
                        value={eventsSearchQuery}
                        onChange={(e) => setEventsSearchQuery(e.target.value)}
                        className="h-8 pr-8 text-xs"
                      />
                    </div>
                    {eventsSearchQuery.trim() && (
                      <div className="mt-1.5 text-xs text-muted-foreground">عرض: {filteredEvents.length} من {events.length}</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {selectedEventItem ? (
                      <div className="rounded-xl border border-dashed p-3 text-xs">
                        <div className="space-y-1 text-right">
                          <div className="font-semibold">{selectedEventItem.displayText || selectedEventItem.pointName || selectedEventItem.name || "حدث"}</div>
                          <div className="text-muted-foreground">
                            {selectedEventItem.eventTimestamp || "بدون وقت"} {selectedEventItem.vehicleName ? `• ${selectedEventItem.vehicleName}` : ""}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              showPanel("events");
                              onTabChange("points");
                              onEventClick?.(selectedEventItem);
                            }}
                          >
                            اذهب للنقطة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => selectedEventVehicle && focusOnLiveVehicle(selectedEventVehicle)}
                            disabled={!selectedEventVehicle}
                          >
                            افتح المركبة المرتبطة
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={getPointEventReportHref(selectedEventItem.pointId || focusPointId || "")}>فتح تقرير الأحداث</Link>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={getPointVisitLogHref(selectedEventItem.pointId || focusPointId || "")}>فتح سجل الزيارات</Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {filteredEvents.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        {events.length === 0 ? "لا توجد أحداث حالياً." : "لا توجد نتائج للبحث."}
                      </div>
                    )}
                    {filteredEvents.map((event) => (
                      <div
                        key={event._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedEventItem(event);
                          showPanel("events");
                          onTabChange("points");
                          onEventClick?.(event);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          setSelectedEventItem(event);
                          showPanel("events");
                          onTabChange("points");
                          onEventClick?.(event);
                        }}
                        className={`cursor-pointer rounded-lg border p-3 text-right transition-colors hover:bg-muted/50 ${
                          newEventIds[event._id]
                            ? "animate-pulse border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-500/30"
                            : event.type === "zone_in"
                              ? "border-emerald-500/25 bg-emerald-500/5"
                              : "border-red-500/25 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{event.eventTimestamp || ""}</span>
                          <div className="flex items-center gap-1.5">
                            {newEventIds[event._id] && (
                              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">جديد</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              event.type === "zone_in"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-500/15 text-red-700 dark:text-red-400"
                            }`}>
                              {event.type === "zone_in" ? "دخول" : "خروج"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 font-semibold">
                          {event.displayText || event.name || event.pointName || `${pointLabel} بدون اسم`}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{event.vehicleName || event.imei || ""}</div>
                        {event.driverName && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {driverLabel}: {event.driverName}
                          </div>
                        )}
                      </div>
                    ))}
                    {eventsHasMore && (
                      <div
                        ref={(node) => {
                          if (eventsLoadMoreSentinelRef) {
                            eventsLoadMoreSentinelRef.current = node;
                          }
                        }}
                        className="h-4 min-h-4"
                        aria-hidden
                      />
                    )}
                    {eventsLoadingMore && <div className="py-2 text-center text-sm text-muted-foreground">جاري التحميل...</div>}
                  </div>
                </>
              )}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => {
              const panelToOpen = lastOpenedPanel || "system-points";
              showPanel(panelToOpen);
              onTabChange(panelToOpen === "live" ? "live" : "points");
            }}
            title="فتح لوحة التفاصيل"
            className="absolute right-0 top-1/2 z-[400] flex h-20 w-10 -translate-y-1/2 flex-col items-center justify-center rounded-l-lg border border-r-0 border-border bg-muted/90 shadow-sm transition-colors hover:bg-muted"
          >
            <PanelRightOpen className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-[10px] text-muted-foreground">التفاصيل</span>
          </button>
        )}
      </div>

      {false && (
      <div className="flex w-full rounded-2xl border bg-card overflow-hidden relative" style={{ minHeight: "520px" }}>
        <div className="flex-1 min-w-0 relative">
          {renderMap("h-[820px] min-h-[820px]", true)}
          {(currentTabLoading || historyLoading || enhancedTrackLoading) && (
            <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
              <LoadingOverlay />
              {historyLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحميل سجل الحركة...</p>}
              {enhancedTrackLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحسين المسار عبر OSRM...</p>}
            </div>
          )}
        </div>

        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            title="فتح القائمة الجانبية"
            className="absolute top-1/2 left-0 -translate-y-1/2 z-[400] flex flex-col items-center justify-center w-10 h-20 rounded-r-lg bg-muted/90 hover:bg-muted border border-r-0 border-border shadow-sm transition-colors"
          >
            <PanelRightOpen className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">القائمة</span>
          </button>
        ) : (
          <>
        {rightPanel && (
          <aside className="w-80 flex-shrink-0 border-r border-l flex flex-col bg-background overflow-hidden max-h-[820px]">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium text-right">
                {rightPanel === "cars" && "أجهزة أثر الخام"}
                {rightPanel === "events" && eventsLabel}
                {rightPanel === "live" && "إحصائيات التتبع الحي"}
                {rightPanel === "layers" && "النقاط والمناطق والسيارات"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setRightPanel(null)} title="إغلاق">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-right">
              {rightPanel === "cars" && (
                <>
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="بحث بالاسم أو اللوحة أو IMEI..."
                        value={atharCarsSearchQuery}
                        onChange={(e) => setAtharCarsSearchQuery(e.target.value)}
                        className="pr-8 text-xs h-8"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      إجمالي: {atharObjects.length}
                      {atharCarsSearchQuery.trim() && ` • عرض: ${filteredAtharObjects.length}`}
                    </div>
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {filteredAtharObjects.map((obj) => {
                      const isSelected = String(obj.id) === String(selectedObjectId);
                      return (
                        <button
                          key={`obj-row-${obj.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedObjectId(String(obj.id));
                            focusOnObject(obj);
                          }}
                          className={`w-full rounded-md border px-2 py-2 text-xs transition ${
                            isSelected ? "bg-primary/10 border-primary/40" : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              {obj.lat != null && obj.lng != null ? `${obj.lat.toFixed(5)}, ${obj.lng.toFixed(5)}` : "بدون موقع"}
                            </span>
                            <span className="font-medium">
                              {obj.name} {obj.plateNumber ? `(${obj.plateNumber})` : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredAtharObjects.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        {atharObjects.length === 0 ? "لا توجد سيارات قادمة من أثر حالياً." : "لا توجد نتائج للبحث."}
                      </div>
                    )}
                  </div>
                  {selectedObject && (
                    <div className="mt-4 border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{selectedObject?.name}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            selectedObject?.active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-600"
                          }`}
                        >
                          {selectedObject?.active ? "نشطة" : "غير نشطة"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div>اللوحة: {selectedObject?.plateNumber || "-"}</div>
                        <div>IMEI: {selectedObject?.imei || "-"}</div>
                        <div>السرعة: {selectedObject?.speed ?? 0} كم/س</div>
                        <div>الاتجاه: {Math.round(selectedObject?.angle || 0)}°</div>
                        <div>وقت الجهاز: {selectedObject?.dtTracker || "-"}</div>
                        <div>وقت الخادم: {selectedObject?.dtServer || "-"}</div>
                      </div>
                      {matchedVehicle && (
                        <div className="text-xs text-muted-foreground">المركبة بالنظام: {matchedVehicle?.name}</div>
                      )}
                      {matchedRoute && (
                        <div className="text-xs text-muted-foreground">المسار الحالي: {matchedRoute?.name}</div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" className="h-8" onClick={() => focusOnObject(selectedObject)} disabled={selectedObject?.lat == null || selectedObject?.lng == null}>
                          تحديد على الخريطة
                        </Button>
                        {matchedVehicle?.routeId ? (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/routes/${String(matchedVehicle?.routeId)}/points`}>عرض المسار</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" disabled>عرض المسار</Button>
                        )}
                        {matchedVehicle?._id ? (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/reports?vehicleId=${matchedVehicle?._id}`}>تقارير المركبة</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" disabled>تقارير المركبة</Button>
                        )}
                      </div>
                    </div>
                  )}
                  {!selectedObject && filteredAtharObjects.length > 0 && (
                    <div className="mt-4 text-xs text-muted-foreground">اختر سيارة لعرض التفاصيل.</div>
                  )}
                </>
              )}
              {rightPanel === "live" && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="font-medium">مركز التتبع الحي</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      إجمالي مباشر: {liveVehicleInventory.length} • بعد الفلاتر: {visibleLiveVehicles.length}
                      {liveVehiclesSearchQuery.trim() && ` • نتائج البحث: ${filteredLiveVehicles.length}`}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      أثر: {liveProviderCounts.athar} • GPS الموبايل: {liveProviderCounts.mobile_app} • تراكار: {liveProviderCounts.traccar}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      تعمل: {liveStatusCounts.moving} • متوقفة: {liveStatusCounts.stopped} • غير متصلة: {liveStatusCounts.offline}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-xs font-medium text-muted-foreground">فلتر المصدر</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "athar", "mobile_app", "traccar"] as const).map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => setLiveProviderFilter(provider)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            liveProviderFilter === provider ? "font-semibold shadow-sm" : "text-muted-foreground hover:bg-muted"
                          }`}
                          style={
                            liveProviderFilter === provider
                              ? provider === "all"
                                ? { borderColor: "#0f172a", backgroundColor: "rgba(15, 23, 42, 0.06)" }
                                : { borderColor: getLiveProviderColor(provider), backgroundColor: `${getLiveProviderColor(provider)}18`, color: getLiveProviderColor(provider) }
                              : undefined
                          }
                        >
                          {liveProviderFilterLabels[provider]} ({provider === "all" ? liveVehicleInventory.length : liveProviderCounts[provider]})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="text-xs font-medium text-muted-foreground">فلتر الحالة</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "moving", "stopped", "offline"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setLiveStatusFilter(status)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            liveStatusFilter === status
                              ? status === "moving"
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                                : status === "stopped"
                                  ? "border-amber-500 bg-amber-500/10 text-amber-700"
                                  : status === "offline"
                                    ? "border-slate-500 bg-slate-500/10 text-slate-700"
                                    : "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {liveStatusFilterLabels[status]} ({status === "all" ? liveVehicleInventory.length : liveStatusCounts[status]})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="ابحث بالمركبة أو المسار أو السائق أو المصدر أو IMEI أو الجهاز..."
                      value={liveVehiclesSearchQuery}
                      onChange={(e) => setLiveVehiclesSearchQuery(e.target.value)}
                      className="h-8 pr-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
                    <span>إظهار أسماء المركبات على الخريطة</span>
                    <button
                      type="button"
                      onClick={() => setShowVehicleNamesOnMap((current) => !current)}
                      className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
                        showVehicleNamesOnMap ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {showVehicleNamesOnMap ? "مفعّل" : "مخفي"}
                    </button>
                  </div>

                  <div className="max-h-[540px] space-y-2 overflow-y-auto">
                    {filteredLiveVehicles.map((vehicle) => (
                      <button
                        key={`live-vehicle-${vehicle.id}`}
                        type="button"
                        onClick={() => focusOnLiveVehicle(vehicle)}
                        className="w-full rounded-xl border px-3 py-3 text-right transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              vehicle.status === "moving"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : vehicle.status === "stopped"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {statusLabel[vehicle.status]}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getLiveProviderColor(vehicle.provider) }}
                            />
                            <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{vehicle.providerLabel}</span>
                            <span className="font-semibold">{vehicle.vehicleName || vehicle.busNumber}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {vehicle.route || "مسار غير معين"} • {vehicle.driverName || "بدون سائق"}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {vehicle.speed} كم/س • {vehicle.lastUpdate}
                        </div>
                        {vehicle.plateNumber && <div className="mt-1 text-[11px] text-muted-foreground">اللوحة: {vehicle.plateNumber}</div>}
                        <div className="mt-1 text-[11px] text-muted-foreground">المنطقة الحالية: {vehicleZoneMap.get(vehicle.id) || "غير معروفة"}</div>
                        {vehicle.accuracy != null && <div className="mt-1 text-[11px] text-muted-foreground">الدقة: {vehicle.accuracy} م</div>}
                        {vehicle.lastRecordedAt && <div className="mt-1 text-[11px] text-muted-foreground">وقت التسجيل: {vehicle.lastRecordedAt}</div>}
                        {vehicle.lastReceivedAt && <div className="mt-1 text-[11px] text-muted-foreground">وقت الاستقبال: {vehicle.lastReceivedAt}</div>}
                        {vehicle.trackingExternalId && <div className="mt-1 text-[11px] text-muted-foreground">معرّف التتبع: {vehicle.trackingExternalId}</div>}
                        {vehicle.deviceName && <div className="mt-1 text-[11px] text-muted-foreground">الجهاز: {vehicle.deviceName}</div>}
                        {vehicle.platform && <div className="mt-1 text-[11px] text-muted-foreground">المنصة: {vehicle.platform}</div>}
                        {vehicle.appVersion && <div className="mt-1 text-[11px] text-muted-foreground">إصدار التطبيق: {vehicle.appVersion}</div>}
                        {vehicle.imei && <div className="mt-1 text-[11px] text-muted-foreground">IMEI: {vehicle.imei}</div>}
                      </button>
                    ))}
                    {filteredLiveVehicles.length === 0 && (
                      <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                        لا توجد مركبات تطابق الفلاتر الحالية.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rightPanel === "events" && (
                <>
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="بحث بالأحداث أو المركبة أو النقطة..."
                        value={eventsSearchQuery}
                        onChange={(e) => setEventsSearchQuery(e.target.value)}
                        className="pr-8 text-xs h-8"
                      />
                    </div>
                    {eventsSearchQuery.trim() && (
                      <div className="text-xs text-muted-foreground mt-1.5">عرض: {filteredEvents.length} من {events.length}</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {filteredEvents.length === 0 && <div className="text-sm text-muted-foreground">{events.length === 0 ? "لا توجد أحداث حالياً." : "لا توجد نتائج للبحث."}</div>}
                    {filteredEvents.map((event) => (
                      <div
                        key={event._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onEventClick?.(event)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && onEventClick) {
                            e.preventDefault();
                            onEventClick(event);
                          }
                        }}
                        className={`rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50 text-right ${
                          newEventIds[event._id]
                            ? "border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-500/30 animate-pulse"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {newEventIds[event._id] && (
                              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">جديد</span>
                            )}
                            <span className="text-xs text-muted-foreground">{event.type === "zone_in" ? "دخول" : "خروج"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{event.eventTimestamp || ""}</span>
                        </div>
                        <div className="font-semibold mt-1">
                          {event.displayText || event.name || event.pointName || `${pointLabel} بدون اسم`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{event.vehicleName || event.imei || ""}</div>
                        {event.driverName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {driverLabel}: {event.driverName}
                          </div>
                        )}
                      </div>
                    ))}
                    {eventsHasMore && (
                      <div
                        ref={(node) => {
                          if (eventsLoadMoreSentinelRef) {
                            eventsLoadMoreSentinelRef.current = node;
                          }
                        }}
                        className="h-4 min-h-4"
                        aria-hidden
                      />
                    )}
                    {eventsLoadingMore && <div className="text-center py-2 text-sm text-muted-foreground">جاري التحميل...</div>}
                  </div>
                </>
              )}
              {rightPanel === "live" && (
                <div className="space-y-3 text-sm">
                  <div className="font-medium">مركبات التتبع الحي: {visibleLiveVehicles.length}</div>
                  <div className="text-muted-foreground">
                    متحركة: {visibleLiveVehicles.filter((v) => v.status === "moving").length} • متوقفة:{" "}
                    {visibleLiveVehicles.filter((v) => v.status === "stopped").length} • غير متصلة:{" "}
                    {visibleLiveVehicles.filter((v) => v.status === "offline").length}
                  </div>
                </div>
              )}
              {rightPanel === "layers" && (
                <>
                  <div className="mb-3">{renderTabSwitcher("w-full")}</div>
                  {onToggleMapView && activeTab === "points" && (
                    <Button variant="outline" size="sm" className="w-full mb-2" onClick={onToggleMapView}>
                      {showZonesWithPoints ? "عرض النقاط فقط" : "عرض النقاط والمناطق"}
                    </Button>
                  )}
                  {activeTab === "points" && (
                    <>
                      <div className="text-xs text-muted-foreground mb-2">نقاط النظام: {points.length} • نقاط أثر: {atharMarkers.length} {layersVisibleLimit < Math.max(points.length, atharMarkers.length) && `(عرض ${layersVisibleLimit}…)`}</div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {points.slice(0, layersVisibleLimit).map((point) => {
                          const pointId = point._id != null ? String(point._id) : `${point.lat}-${point.lng}`;
                          const selId =
                            selectedPoint != null
                              ? selectedPoint?._id != null
                                ? String(selectedPoint?._id)
                                : `${selectedPoint?.lat}-${selectedPoint?.lng}`
                              : "";
                          const isSelected = selectedPoint != null && pointId === selId;
                          return (
                            <button
                              key={pointId}
                              type="button"
                              onClick={() => {
                                setSelectedPoint(point);
                                setSelectedMarker(null);
                              }}
                              className={`w-full rounded-md border px-2 py-2 text-xs transition text-right ${
                                isSelected ? "bg-primary/10 border-primary/40" : "hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {Number(point.lat).toFixed(5)}, {Number(point.lng).toFixed(5)}
                                </span>
                                <span className="font-medium">{point.nameAr || point.name || "نقطة نظام"}</span>
                              </div>
                            </button>
                          );
                        })}
                        {atharMarkers.slice(0, layersVisibleLimit).map((marker) => {
                          const isSelected = selectedMarker?.id === marker.id;
                          return (
                            <button
                              key={`marker-${marker.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedMarker(marker);
                                setSelectedPoint(null);
                              }}
                              className={`w-full rounded-md border px-2 py-2 text-xs transition text-right ${
                                isSelected ? "bg-primary/10 border-primary/40" : "hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {Number(marker.lat).toFixed(5)}, {Number(marker.lng).toFixed(5)}
                                </span>
                                <span className="font-medium">{marker.name || `نقطة أثر ${marker.id}`}</span>
                              </div>
                            </button>
                          );
                        })}
                        {points.length === 0 && atharMarkers.length === 0 && (
                          <div className="text-xs text-muted-foreground">لا توجد نقاط أو علامات.</div>
                        )}
                      </div>
                      {selectedPoint ? (
                        <div className="mt-4 border-t pt-3 space-y-2">
                          {eventDetailsForPoint && focusPointId && String(selectedPoint?._id) === String(focusPointId) && (
                            <>
                              <div className="text-xs font-semibold text-muted-foreground">الحدث المحدد</div>
                              <div className="rounded-md border bg-muted/40 p-2 text-[11px] text-muted-foreground space-y-1">
                                <div>{eventDetailsForPoint?.displayText || "—"}</div>
                                <div>الوقت: {eventDetailsForPoint?.eventTimestamp || "—"}</div>
                                <div>المركبة: {eventDetailsForPoint?.vehicleName || "—"}</div>
                                <div>النوع: {eventDetailsForPoint?.type === "zone_in" ? "دخول" : eventDetailsForPoint?.type === "zone_out" ? "خروج" : eventDetailsForPoint?.type || "—"}</div>
                                {eventDetailsForPoint?.driverName && <div>السائق: {eventDetailsForPoint?.driverName}</div>}
                              </div>
                            </>
                          )}
                          <div className="font-semibold">{selectedPoint?.nameAr || selectedPoint?.name || "نقطة"}</div>
                          <div className="grid gap-2 text-[11px] text-muted-foreground">
                            <div>النوع: {pointTypeLabels[selectedPoint?.type || ""] || selectedPoint?.type || "—"}</div>
                            <div>خط العرض: {Number(selectedPoint?.lat).toFixed(6)}</div>
                            <div>خط الطول: {Number(selectedPoint?.lng).toFixed(6)}</div>
                            <div>نصف القطر: {Number(selectedPoint?.radiusMeters) || 500} م</div>
                            {selectedPoint?.zoneId && <div>معرف المنطقة: {selectedPoint?.zoneId}</div>}
                            {selectedPoint?.addressText && <div>العنوان: {selectedPoint?.addressText}</div>}
                            {selectedPoint?._id != null && <div>المعرف: {String(selectedPoint?._id)}</div>}
                          </div>
                        </div>
                      ) : selectedMarker ? (
                        <div className="mt-4 border-t pt-3 space-y-2">
                          <div className="font-semibold">{selectedMarker?.name || `نقطة أثر ${selectedMarker?.id}`}</div>
                          <div className="grid gap-2 text-[11px] text-muted-foreground">
                            <div>المعرف في أثر: {selectedMarker?.id}</div>
                            <div>خط العرض: {Number(selectedMarker?.lat).toFixed(6)}</div>
                            <div>خط الطول: {Number(selectedMarker?.lng).toFixed(6)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-xs text-muted-foreground">اختر نقطة أو علامة لعرض التفاصيل.</div>
                      )}
                    </>
                  )}
                  {activeTab === "zones" && selectedZone != null && (
                    <div className="mt-3 space-y-2">
                      <div className="font-semibold">{selectedZone?.name}</div>
                      <div className="grid gap-2 text-[11px] text-muted-foreground">
                        <div>المعرف: {selectedZone?.id}</div>
                        {selectedZone?.color && (
                          <div className="flex items-center gap-2">
                            <span>اللون:</span>
                            <span className="inline-block h-4 w-4 rounded border border-border" style={{ backgroundColor: selectedZone?.color }} title={selectedZone?.color} />
                            <span>{selectedZone?.color}</span>
                          </div>
                        )}
                        {selectedZone?.center && (
                          <>
                            <div>خط العرض (المركز): {selectedZone?.center?.lat?.toFixed(6)}</div>
                            <div>خط الطول (المركز): {selectedZone?.center?.lng?.toFixed(6)}</div>
                          </>
                        )}
                        <div>عدد الرؤوس: {selectedZone?.vertices?.length ?? 0}</div>
                      </div>
                    </div>
                  )}
                  {activeTab === "zones" && selectedZone == null && (
                    <div className="text-xs text-muted-foreground mt-2">اضغط على منطقة على الخريطة لعرض التفاصيل.</div>
                  )}
                  {activeTab === "objects" && rightPanel === "layers" && (
                    <>
                      <div className="text-xs text-muted-foreground mb-2">إجمالي: {atharObjects.length} {layersVisibleLimit < atharObjects.length && `(عرض ${layersVisibleLimit}…)`}</div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {atharObjects.slice(0, layersVisibleLimit).map((obj) => {
                          const isSelected = String(obj.id) === String(selectedObjectId);
                          return (
                            <button
                              key={`obj-row-${obj.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedObjectId(String(obj.id));
                                focusOnObject(obj);
                                onTabChange("objects");
                              }}
                              className={`w-full rounded-md border px-2 py-2 text-xs transition ${
                                isSelected ? "bg-primary/10 border-primary/40" : "hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">
                                  {obj.lat != null && obj.lng != null ? `${obj.lat.toFixed(5)}, ${obj.lng.toFixed(5)}` : "بدون موقع"}
                                </span>
                                <span className="font-medium">{obj.name} {obj.plateNumber ? `(${obj.plateNumber})` : ""}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedObject && (
                        <div className="mt-4 border-t pt-3 space-y-2">
                          <div className="font-semibold">{selectedObject?.name}</div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                            <div>اللوحة: {selectedObject?.plateNumber || "-"}</div>
                            <div>السرعة: {selectedObject?.speed ?? 0} كم/س</div>
                          </div>
                          <Button size="sm" className="h-8 mt-1" onClick={() => selectedObject?.lat != null && selectedObject?.lng != null && focusOnObject(selectedObject)}>
                            تحديد على الخريطة
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        )}

        <div className="flex flex-col w-14 flex-shrink-0 bg-muted/40 py-2 gap-1 border-l">
          <button
            type="button"
            title="إغلاق القائمة الجانبية"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center h-8 w-10 mx-auto rounded-lg transition-colors hover:bg-muted mb-1"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            title={eventsLabel}
            onClick={() => openRightPanel("events")}
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              rightPanel === "events" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="لوحة تتبع حي"
            onClick={() => openRightPanel("live")}
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              rightPanel === "live" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <BarChart2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="النقاط والمناطق والسيارات"
            onClick={() => openRightPanel("layers")}
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              rightPanel === "layers" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <Layers className="h-5 w-5" />
          </button>
        </div>
          </>
        )}
      </div>

      )}

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="h-[96vh] w-[98vw] max-w-[98vw] overflow-hidden p-0 text-right">
          <div className="flex h-full flex-col bg-gradient-to-b from-emerald-950/50 to-background">
            <DialogHeader className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setFullscreenOpen(false)}>
                  <X className="h-4 w-4" />
                  إغلاق
                </Button>
                <div className="text-right">
                  <DialogTitle className="text-lg">الخريطة التفاعلية</DialogTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activeTab === "live" && `مركبات مباشرة: ${filteredLiveVehicles.length}`}
                    {activeTab === "points" && `نقاط: ${points.length} • نقاط أثر: ${atharMarkers.length}`}
                    {activeTab === "zones" && `مناطق أثر: ${zones.length}`}
                    {activeTab === "objects" && `سيارات أثر: ${atharObjects.length}`}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">استخدم الشريط العلوي داخل الخريطة للتنقل بين التفاصيل.</div>
            </DialogHeader>

            <div className="relative flex-1 p-3">
              {renderMap("h-full")}
              {(currentTabLoading || historyLoading || enhancedTrackLoading) && (
                <div className="absolute inset-3 z-[500] flex flex-col items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
                  <LoadingOverlay />
                  {historyLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحميل سجل الحركة...</p>}
                  {enhancedTrackLoading && <p className="mt-2 text-xs text-muted-foreground">جارٍ تحسين المسار عبر OSRM...</p>}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
