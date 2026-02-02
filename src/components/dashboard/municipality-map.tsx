"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon } from "react-leaflet";
import L from "leaflet";
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

type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

type MapZone = {
  id: string;
  name: string;
  color?: string;
  center: { lat: number; lng: number } | null;
  vertices: Array<{ lat: number; lng: number }>;
};

type MapRoute = {
  _id: string;
  name: string;
  points: Array<{ lat: number; lng: number; label: string }>;
  path?: {
    type: "LineString";
    coordinates: number[][];
  };
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

export function MunicipalityMap({
  municipality,
  markers = [],
  zones = [],
  points,
  routes,
}: {
  municipality: MunicipalityInfo | null;
  markers?: MapMarker[];
  zones?: MapZone[];
  points: MapPoint[];
  routes: MapRoute[];
}) {
  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
    }
    if (markers.length > 0) {
      return [markers[0].lat, markers[0].lng] as [number, number];
    }
    if (points.length > 0) {
      return [points[0].lat, points[0].lng] as [number, number];
    }
    if (zones.length > 0 && zones[0].center) {
      return [zones[0].center.lat, zones[0].center.lng] as [number, number];
    }
    return defaultCenter;
  }, [municipality, markers, points, zones]);

  return (
    <div className="h-[520px] w-full rounded-2xl overflow-hidden border bg-background">
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

        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-right">
                <div className="font-semibold">{marker.name || "علامة"}</div>
                <div className="text-xs text-muted-foreground">علامة من أثر</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {zones.map((zone) => {
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

        {points.map((point) => {
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
                    {pointTypeLabels[point.type || ""] || point.type || "حاوية"}
                  </div>
                  <div className="text-xs text-muted-foreground">نصف القطر: {radius} م</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {points.map((point) => {
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

        {routes.map((route) => {
          const pathPositions =
            route.path?.coordinates?.length
              ? route.path.coordinates.map((c) => [c[1], c[0]])
              : route.points.map((p) => [p.lat, p.lng]);
          return (
            <Polyline
              key={route._id}
              positions={pathPositions}
              pathOptions={{ color: "#16a34a", weight: 4 }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
