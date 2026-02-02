"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type MapPoint = {
  _id: string;
  name: string;
  nameAr?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: string;
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
  points,
  routes,
}: {
  municipality: MunicipalityInfo | null;
  points: MapPoint[];
  routes: MapRoute[];
}) {
  const center = useMemo(() => {
    if (municipality) {
      return [municipality.centerLat, municipality.centerLng] as [number, number];
    }
    if (points.length > 0) {
      return [points[0].lat, points[0].lng] as [number, number];
    }
    return defaultCenter;
  }, [municipality, points]);

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

        {points.map((point) => (
          <Marker key={point._id} position={[point.lat, point.lng]}>
            <Popup>
              <div className="text-right">
                <div className="font-semibold">{point.nameAr || point.name}</div>
                <div className="text-xs text-muted-foreground">
                  {pointTypeLabels[point.type] || point.type}
                </div>
                <div className="text-xs text-muted-foreground">
                  نصف القطر: {point.radiusMeters} م
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {points.map((point) => (
          <Circle
            key={`${point._id}-circle`}
            center={[point.lat, point.lng]}
            radius={point.radiusMeters}
            pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.08 }}
          />
        ))}

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
