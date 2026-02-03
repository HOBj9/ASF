"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from "react-leaflet";
import L from "leaflet";
import { Maximize2, BusFront, MapPin, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function getBusIcon(status: LiveVehicle["status"]) {
  const bgColor = status === "moving" ? "#16a34a" : status === "stopped" ? "#f59e0b" : "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;border-radius:999px;background:${bgColor};
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:14px;
    ">🚌</div>`,
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

type MapTab = "live" | "points" | "zones";

export function MunicipalityMap({
  municipality,
  liveVehicles = [],
  zones = [],
  points,
}: {
  municipality: MunicipalityInfo | null;
  liveVehicles?: LiveVehicle[];
  zones?: MapZone[];
  points: MapPoint[];
}) {
  const [tab, setTab] = useState<MapTab>("live");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const visibleLiveVehicles = useMemo(
    () => liveVehicles.filter((v) => Array.isArray(v.coordinates) && v.coordinates.length === 2),
    [liveVehicles]
  );

  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
    }
    if (tab === "live" && visibleLiveVehicles.length > 0) {
      return visibleLiveVehicles[0].coordinates as [number, number];
    }
    if (tab === "points" && points.length > 0) {
      return [points[0].lat, points[0].lng] as [number, number];
    }
    if (tab === "zones" && zones.length > 0 && zones[0].center) {
      return [zones[0].center.lat, zones[0].center.lng] as [number, number];
    }
    return defaultCenter;
  }, [municipality, tab, visibleLiveVehicles, points, zones]);

  const renderMap = (heightClass: string) => (
    <div className={`${heightClass} w-full overflow-hidden rounded-2xl border bg-background`}>
      <MapContainer center={center} zoom={13} className="h-full w-full">
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

        {tab === "live" &&
          visibleLiveVehicles.map((vehicle) => (
            <Marker key={vehicle.id} position={vehicle.coordinates as [number, number]} icon={getBusIcon(vehicle.status)}>
              <Popup>
                <div className="text-right space-y-1">
                  <div className="font-semibold">{vehicle.busNumber}</div>
                  <div className="text-xs text-muted-foreground">السائق: {vehicle.driverName}</div>
                  <div className="text-xs text-muted-foreground">الحالة: {statusLabel[vehicle.status]}</div>
                  <div className="text-xs text-muted-foreground">السرعة: {vehicle.speed} كم/س</div>
                  {vehicle.imei && <div className="text-xs text-muted-foreground">IMEI: {vehicle.imei}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

        {tab === "points" &&
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

        {tab === "points" &&
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

        {tab === "zones" &&
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
      </MapContainer>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setFullscreenOpen(true)}>
          <Maximize2 className="h-4 w-4" />
          عرض كامل
        </Button>

        <Tabs value={tab} onValueChange={(value) => setTab(value as MapTab)} dir="rtl" className="w-full max-w-xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live" className="gap-1.5"><BusFront className="h-4 w-4" />التتبع الحي</TabsTrigger>
            <TabsTrigger value="points" className="gap-1.5"><MapPin className="h-4 w-4" />نقاط أثر</TabsTrigger>
            <TabsTrigger value="zones" className="gap-1.5"><Hexagon className="h-4 w-4" />مناطق أثر</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="hidden" />
          <TabsContent value="points" className="hidden" />
          <TabsContent value="zones" className="hidden" />
        </Tabs>
      </div>

      {renderMap("h-[520px]")}

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="h-[94vh] w-[96vw] max-w-[96vw] p-3 text-right">
          <DialogHeader>
            <DialogTitle>الخريطة التفاعلية</DialogTitle>
          </DialogHeader>
          {renderMap("h-[calc(94vh-80px)]")}
        </DialogContent>
      </Dialog>
    </div>
  );
}
