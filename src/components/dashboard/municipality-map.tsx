"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-patch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/lib/assets/MarkerCluster.css";
import "react-leaflet-cluster/lib/assets/MarkerCluster.Default.css";
import L from "leaflet";
import { Maximize2, BusFront, MapPin, Hexagon, CarFront, X, BarChart2, CalendarDays, Layers, PanelRightOpen, PanelRightClose, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  busNumber: string;
  driverName: string;
  status: "moving" | "stopped" | "offline";
  lastUpdate: string;
  speed: number;
  heading: number;
  coordinates: [number, number] | null;
  imei?: string;
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
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanelType>(null);
  const [lastOpenedPanel, setLastOpenedPanel] = useState<Exclude<RightPanelType, null>>("system-points");
  const [showVehicleNamesOnMap, setShowVehicleNamesOnMap] = useState(true);
  const [atharCarsSearchQuery, setAtharCarsSearchQuery] = useState("");
  const [eventsSearchQuery, setEventsSearchQuery] = useState("");
  const [pointTypeFilter, setPointTypeFilter] = useState<string | null>(null);
  const [pointPanelSearch, setPointPanelSearch] = useState("");
  const [objectsPanelOpen, setObjectsPanelOpen] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<AtharMarker | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
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

  const visibleLiveVehicles = useMemo(
    () => liveVehicles.filter((v) => Array.isArray(v.coordinates) && v.coordinates.length === 2),
    [liveVehicles]
  );

  const vehicleZoneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of visibleLiveVehicles) {
      const [lat, lng] = vehicle.coordinates as [number, number];
      const zone = zones.find((z) => z.vertices?.length >= 3 && isPointInsidePolygon(lat, lng, z.vertices));
      map.set(vehicle.id, zone?.name || "خارج المناطق");
    }
    return map;
  }, [visibleLiveVehicles, zones]);

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
    if (activeTab !== "points") {
      setSelectedPoint(null);
      setPointTypeFilter(null);
      setPointPanelSearch("");
    }
    setLayersVisibleLimit(MAP_LAYER_BATCH_SIZE);
  }, [activeTab]);

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
    onTabChange(panel === "athar-live" ? "objects" : "points");
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

  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
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
  }, [municipality, activeTab, visibleLiveVehicles, points, atharMarkers, zones, atharObjects]);

  const mapKey = `map-${municipality?.name ?? "default"}`;
  const initialCenter = center;

  const liveMarkersLayer = useMemo(() => {
    if (activeTab !== "live") return null;
    return visibleLiveVehicles.map((vehicle) => {
      const matchedObject = vehicle.imei ? objectByImei.get(vehicle.imei) : null;
      return (
        <Marker
          key={`${vehicle.id}-${showVehicleNamesOnMap ? "label" : "nolabel"}`}
          position={vehicle.coordinates as [number, number]}
          icon={getBusIcon(vehicle.status, vehicle.heading, showVehicleNamesOnMap ? vehicle.busNumber : undefined)}
        >
          <Popup>
            <div className="text-right space-y-1 max-w-[300px]">
              <div className="font-semibold">{vehicle.busNumber}</div>
              <div className="text-xs text-muted-foreground">السائق: {vehicle.driverName}</div>
              <div className="text-xs text-muted-foreground">الحالة: {statusLabel[vehicle.status]}</div>
              <div className="text-xs text-muted-foreground">السرعة: {vehicle.speed} كم/س</div>
              <div className="text-xs text-muted-foreground">الاتجاه: {Math.round(vehicle.heading || 0)}°</div>
              <div className="text-xs text-muted-foreground">
                المنطقة: {vehicleZoneMap.get(vehicle.id) || "غير محددة"}
              </div>
              {vehicle.imei && <div className="text-xs text-muted-foreground">IMEI: {vehicle.imei}</div>}
              {matchedObject && (
                <>
                  <div className="mt-2 border-t pt-2 text-xs font-medium">تفاصيل السيارة من أثر</div>
                  <div className="text-xs text-muted-foreground">الاسم: {matchedObject.name || "-"}</div>
                  <div className="text-xs text-muted-foreground">اللوحة: {matchedObject.plateNumber || "-"}</div>
                  <div className="text-xs text-muted-foreground">الجهاز: {matchedObject.device || "-"}</div>
                  <div className="text-xs text-muted-foreground">الموديل: {matchedObject.model || "-"}</div>
                  <div className="text-xs text-muted-foreground">وقت الجهاز: {matchedObject.dtTracker || "-"}</div>
                  <div className="text-xs text-muted-foreground">وقت الخادم: {matchedObject.dtServer || "-"}</div>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [activeTab, visibleLiveVehicles, objectByImei, vehicleZoneMap, showVehicleNamesOnMap]);

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
  }, [activeTab, points, pointTypeFilter, showVehicleNamesOnMap, layersVisibleLimit, focusOnPoint]);

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
  }, [activeTab, atharMarkers, showVehicleNamesOnMap, layersVisibleLimit]);

  const renderMap = (heightClass: string, attachRef = false) => (
    <div className={`${heightClass} w-full overflow-hidden rounded-2xl border bg-background relative`}>
      <nav className="absolute top-0 right-0 left-0 z-[1000] flex flex-wrap items-center justify-start gap-2 rounded-t-2xl border-b border-border/50 bg-background/95 px-3 py-2 backdrop-blur-sm" dir="rtl">
        <div className="flex flex-wrap items-center gap-2" dir="rtl">
          <Button
            type="button"
            variant={rightPanel === "athar-live" ? "default" : "secondary"}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => togglePanel("athar-live")}
          >
            <CarFront className="h-3.5 w-3.5" />
            التتبع الحي من أثر
          </Button>
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

        {liveMarkersLayer}

        <MarkerClusterGroup
          disableClusteringAtZoom={17}
          showCoverageOnHover={false}
          animate={true}
          animateAddingMarkers={false}
          removeOutsideVisibleBounds={true}
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
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="live" className="gap-1.5">
          <BusFront className="h-4 w-4" />
          التتبع الحي
        </TabsTrigger>
        <TabsTrigger value="points" className="gap-1.5">
          <MapPin className="h-4 w-4" />
          نقاط أثر
        </TabsTrigger>
        <TabsTrigger value="zones" className="gap-1.5">
          <Hexagon className="h-4 w-4" />
          مناطق أثر
        </TabsTrigger>
        <TabsTrigger value="objects" className="gap-1.5">
          <CarFront className="h-4 w-4" />
          سيارات أثر
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
    if (panel === "cars") onTabChange("objects");
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
          {currentTabLoading && (
            <div className="absolute inset-0 z-[500] rounded-2xl">
              <LoadingOverlay />
            </div>
          )}
        </div>

        {rightPanel ? (
          <aside className="flex h-[820px] w-[360px] max-w-[40vw] flex-shrink-0 flex-col border-l bg-background" dir="rtl">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-right text-sm font-medium">
                {rightPanel === "athar-live" && "التتبع الحي من أثر"}
                {rightPanel === "system-points" && "نقاط النظام مع المناطق المرتبطة فيها"}
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
                      <div className="py-3 text-center text-xs text-muted-foreground">لا توجد نقاط من نوع "{pointTypeLabels[pointTypeFilter] || pointTypeFilter}".</div>
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
                          showPanel("events");
                          onTabChange("points");
                          onEventClick?.(event);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
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
              onTabChange(panelToOpen === "athar-live" ? "objects" : "points");
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
          {currentTabLoading && (
            <div className="absolute inset-0 z-[500] rounded-2xl">
              <LoadingOverlay />
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
                {rightPanel === "cars" && "إجمالي سيارات أثر"}
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
            title="إجمالي سيارات أثر"
            onClick={() => openRightPanel("cars")}
            className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors ${
              rightPanel === "cars" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <CarFront className="h-5 w-5" />
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
            title="إحصائيات التتبع الحي"
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
                    {activeTab === "live" && `مركبات مباشرة: ${visibleLiveVehicles.length}`}
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
              {currentTabLoading && (
                <div className="absolute inset-3 z-[500] rounded-2xl">
                  <LoadingOverlay />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
