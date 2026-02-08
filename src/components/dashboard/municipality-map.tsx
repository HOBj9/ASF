"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from "react-leaflet";
import L from "leaflet";
import { Maximize2, BusFront, MapPin, Hexagon, CarFront, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type MapPoint = {
  _id: string | { toString(): string };
  name?: string;
  nameAr?: string;
  lat: number;
  lng: number;
  radiusMeters?: number;
  type?: string;
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

const pointTypeLabels: Record<string, string> = {
  container: "حاوية",
  station: "محطة",
  facility: "منشأة",
  other: "أخرى",
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

function getBusIcon(status: LiveVehicle["status"], heading: number) {
  const bgColor = status === "moving" ? "#16a34a" : status === "stopped" ? "#f59e0b" : "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="
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
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -10],
  });
}

const statusLabel: Record<LiveVehicle["status"], string> = {
  moving: "متحركة",
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

function RawJsonDetails({ value }: { value: unknown }) {
  return (
    <details className="mt-2 rounded border p-2">
      <summary className="cursor-pointer text-xs font-medium">RAW JSON</summary>
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-left">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export type MapTab = "live" | "points" | "zones" | "objects";

export function MunicipalityMap({
  municipality,
  liveVehicles = [],
  atharObjects = [],
  vehicles = [],
  routes = [],
  zones = [],
  points,
  activeTab,
  onTabChange,
  tabLoading = {},
}: {
  municipality: MunicipalityInfo | null;
  liveVehicles?: LiveVehicle[];
  atharObjects?: AtharObject[];
  vehicles?: VehicleSummary[];
  routes?: RouteSummary[];
  zones?: MapZone[];
  points: MapPoint[];
  activeTab: MapTab;
  onTabChange: (tab: MapTab) => void;
  tabLoading?: Partial<Record<MapTab, boolean>>;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [objectsPanelOpen, setObjectsPanelOpen] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const currentTabLoading = !!tabLoading[activeTab];

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

  useEffect(() => {
    if (activeTab !== "objects") {
      setObjectsPanelOpen(false);
    }
  }, [activeTab]);

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
      vehicleByAtharId.get(String(selectedObject.id)) ||
      vehicleByImei.get(String(selectedObject.imei)) ||
      null
    );
  }, [selectedObject, vehicleByAtharId, vehicleByImei]);

  const matchedRoute = useMemo(() => {
    if (!matchedVehicle?.routeId) return null;
    return routeById.get(String(matchedVehicle.routeId)) || null;
  }, [matchedVehicle, routeById]);

  const focusOnObject = (obj: AtharObject | null) => {
    if (!obj || obj.lat == null || obj.lng == null || !mapRef.current) return;
    mapRef.current.setView([Number(obj.lat), Number(obj.lng)], 15, { animate: true });
  };

  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
    }
    if (activeTab === "live" && visibleLiveVehicles.length > 0) {
      return visibleLiveVehicles[0].coordinates as [number, number];
    }
    if (activeTab === "points" && points.length > 0) {
      return [points[0].lat, points[0].lng] as [number, number];
    }
    if (activeTab === "zones" && zones.length > 0 && zones[0].center) {
      return [zones[0].center.lat, zones[0].center.lng] as [number, number];
    }
    if (activeTab === "objects") {
      const objectWithCoords = atharObjects.find((o) => o.lat !== null && o.lng !== null);
      if (objectWithCoords) return [Number(objectWithCoords.lat), Number(objectWithCoords.lng)] as [number, number];
    }
    return defaultCenter;
  }, [municipality, activeTab, visibleLiveVehicles, points, zones, atharObjects]);

  const renderMap = (heightClass: string, attachRef = false) => (
    <div className={`${heightClass} w-full overflow-hidden rounded-2xl border bg-background`}>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        whenCreated={attachRef ? (map) => (mapRef.current = map) : undefined}
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

        {activeTab === "live" &&
          visibleLiveVehicles.map((vehicle) => {
            const matchedObject = vehicle.imei ? objectByImei.get(vehicle.imei) : null;
            return (
              <Marker
                key={vehicle.id}
                position={vehicle.coordinates as [number, number]}
                icon={getBusIcon(vehicle.status, vehicle.heading)}
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
                        <RawJsonDetails value={matchedObject.raw} />
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {activeTab === "points" &&
          points.map((point) => {
            const pointId = point._id != null ? String(point._id) : `${point.lat}-${point.lng}`;
            const lat = Number(point.lat);
            const lng = Number(point.lng);
            const radius = Number(point.radiusMeters) || 500;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return (
              <Marker key={pointId} position={[lat, lng]}>
                <Popup>
                  <div className="text-right">
                    <div className="font-semibold">{point.nameAr || point.name || "نقطة"}</div>
                    <div className="text-xs text-muted-foreground">
                      {pointTypeLabels[point.type || ""] || point.type || "نقطة"}
                    </div>
                    <div className="text-xs text-muted-foreground">نصف القطر: {radius} م</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {activeTab === "points" &&
          points.map((point) => {
            const pointId = point._id != null ? String(point._id) : `${point.lat}-${point.lng}`;
            const lat = Number(point.lat);
            const lng = Number(point.lng);
            const radius = Number(point.radiusMeters) || 500;
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius <= 0) return null;
            return (
              <Circle
                key={`${pointId}-circle`}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.08 }}
              />
            );
          })}

        {activeTab === "zones" &&
          zones.map((zone) => {
            const positions = zone.vertices.map((v) => [v.lat, v.lng]) as Array<[number, number]>;
            if (positions.length < 3) return null;
            const color = zone.color || "#f59e0b";
            return (
              <Polygon
                key={`zone-${zone.id}`}
                positions={positions}
                pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.12 }}
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
            .map((obj) => (
              <Marker
                key={`obj-${obj.id}`}
                position={[Number(obj.lat), Number(obj.lng)]}
                icon={getBusIcon(obj.active ? "moving" : "stopped", obj.angle)}
                eventHandlers={{
                  click: () => {
                    setSelectedObjectId(String(obj.id));
                    setObjectsPanelOpen(true);
                  },
                }}
              >
                <Popup>
                  <div className="text-right space-y-1 max-w-[300px]">
                    <div className="font-semibold">{obj.name}</div>
                    {obj.plateNumber && <div className="text-xs text-muted-foreground">اللوحة: {obj.plateNumber}</div>}
                    <div className="text-xs text-muted-foreground">IMEI: {obj.imei || "-"}</div>
                    <div className="text-xs text-muted-foreground">الحالة: {obj.active ? "نشطة" : "غير نشطة"}</div>
                    <div className="text-xs text-muted-foreground">السرعة: {obj.speed} كم/س</div>
                    <div className="text-xs text-muted-foreground">الاتجاه: {Math.round(obj.angle || 0)}°</div>
                    {obj.dtTracker && <div className="text-xs text-muted-foreground">وقت الجهاز: {obj.dtTracker}</div>}
                    {obj.dtServer && <div className="text-xs text-muted-foreground">وقت الخادم: {obj.dtServer}</div>}
                    {obj.model && <div className="text-xs text-muted-foreground">الموديل: {obj.model}</div>}
                    {obj.device && <div className="text-xs text-muted-foreground">الجهاز: {obj.device}</div>}
                    <RawJsonDetails value={obj.raw} />
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setFullscreenOpen(true)}>
          <Maximize2 className="h-4 w-4" />
          عرض كامل
        </Button>

        {renderTabSwitcher("w-full max-w-xl")}
      </div>

      {activeTab === "objects" && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setObjectsPanelOpen((open) => !open)}
          >
            <CarFront className="h-4 w-4" />
            إجمالي سيارات أثر: {atharObjects.length}
          </Button>
          {objectsPanelOpen && (
            <span className="text-xs text-muted-foreground">اضغط على السيارة لعرض التفاصيل</span>
          )}
        </div>
      )}

      <div className={`relative ${activeTab === "objects" && objectsPanelOpen ? "lg:flex lg:gap-4" : ""}`}>
        <div
          className={`${activeTab === "objects" && objectsPanelOpen ? "lg:order-2 lg:flex-1" : ""} relative`}
        >
          {renderMap("h-[520px]", true)}
          {currentTabLoading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-[1px]">
              <div className="w-full max-w-md space-y-3 px-6">
                <Skeleton className="h-5 w-32 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5 mx-auto" />
              </div>
            </div>
          )}
        </div>

        {activeTab === "objects" && objectsPanelOpen && (
          <aside className="mt-3 rounded-2xl border bg-background p-3 text-right shadow-sm lg:order-1 lg:mt-0 lg:w-[340px]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">سيارات أثر</div>
              <Button variant="ghost" size="icon" onClick={() => setObjectsPanelOpen(false)} title="إغلاق">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 max-h-52 overflow-y-auto space-y-1 pr-1">
              {atharObjects.map((obj) => {
                const isSelected = String(obj.id) === String(selectedObjectId);
                return (
                  <button
                    key={`obj-row-${obj.id}`}
                    type="button"
                    onClick={() => setSelectedObjectId(String(obj.id))}
                    className={`w-full rounded-md border px-2 py-2 text-xs transition ${
                      isSelected ? "bg-primary/10 border-primary/40 text-foreground" : "hover:bg-muted"
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
              {atharObjects.length === 0 && (
                <div className="text-xs text-muted-foreground">لا توجد سيارات قادمة من أثر حالياً.</div>
              )}
            </div>

            {selectedObject ? (
              <div className="mt-4 border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{selectedObject.name}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      selectedObject.active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-600"
                    }`}
                  >
                    {selectedObject.active ? "نشطة" : "غير نشطة"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>اللوحة: {selectedObject.plateNumber || "-"}</div>
                  <div>IMEI: {selectedObject.imei || "-"}</div>
                  <div>السرعة: {selectedObject.speed} كم/س</div>
                  <div>الاتجاه: {Math.round(selectedObject.angle || 0)}°</div>
                  <div>وقت الجهاز: {selectedObject.dtTracker || "-"}</div>
                  <div>وقت الخادم: {selectedObject.dtServer || "-"}</div>
                </div>

                {matchedVehicle && (
                  <div className="text-xs text-muted-foreground">المركبة بالنظام: {matchedVehicle.name}</div>
                )}
                {matchedRoute && (
                  <div className="text-xs text-muted-foreground">المسار الحالي: {matchedRoute.name}</div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => focusOnObject(selectedObject)}
                    disabled={selectedObject.lat == null || selectedObject.lng == null}
                  >
                    تحديد على الخريطة
                  </Button>

                  {matchedVehicle?.routeId ? (
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <Link href={`/dashboard/routes/${String(matchedVehicle.routeId)}/points`}>عرض المسار</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" disabled>
                      عرض المسار
                    </Button>
                  )}

                  {matchedVehicle?._id ? (
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <Link href={`/dashboard/reports?vehicleId=${matchedVehicle._id}`}>تقارير المركبة</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" disabled>
                      تقارير المركبة
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-muted-foreground">اختر سيارة لعرض التفاصيل.</div>
            )}
          </aside>
        )}
      </div>

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
                    {activeTab === "points" && `نقاط أثر: ${points.length}`}
                    {activeTab === "zones" && `مناطق أثر: ${zones.length}`}
                    {activeTab === "objects" && `سيارات أثر: ${atharObjects.length}`}
                  </div>
                </div>
              </div>
              <div className="mt-3">{renderTabSwitcher("w-full")}</div>
            </DialogHeader>

            <div className="relative flex-1 p-3">
              {renderMap("h-full")}
              {currentTabLoading && (
                <div className="absolute inset-3 z-[500] flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-[1px]">
                  <div className="w-full max-w-md space-y-3 px-6">
                    <Skeleton className="h-5 w-32 mx-auto" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5 mx-auto" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
