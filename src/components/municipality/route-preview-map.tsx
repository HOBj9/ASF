"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type PreviewPoint = {
  _id: string;
  name?: string;
  nameAr?: string;
  lat: number;
  lng: number;
};

type PreviewGeometry = {
  type: "LineString";
  coordinates: number[][];
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

export function RoutePreviewMap({
  points,
  geometry,
}: {
  points: PreviewPoint[];
  geometry: PreviewGeometry | null;
}) {
  const center: [number, number] = useMemo(() => {
    if (points.length > 0) return [points[0].lat, points[0].lng];
    return [33.5138, 36.2765];
  }, [points]);

  const polylinePositions = useMemo(() => {
    if (geometry?.coordinates?.length) {
      return geometry.coordinates.map((c) => [c[1], c[0]]) as Array<[number, number]>;
    }
    return points.map((p) => [p.lat, p.lng]) as Array<[number, number]>;
  }, [geometry, points]);

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((point, index) => (
          <Marker key={point._id} position={[point.lat, point.lng]}>
            {(index === 0 || index === points.length - 1) && (
              <Tooltip direction="top" offset={[0, -16]} opacity={1} permanent>
                {index === 0 ? "نقطة البداية" : "نقطة النهاية"}
              </Tooltip>
            )}

            <Popup>
              <div className="text-right">
                <div className="font-medium">
                  {index + 1}. {point.nameAr || point.name || "نقطة"}
                </div>
                {index === 0 && <div className="mt-1 text-xs text-emerald-700">البداية</div>}
                {index === points.length - 1 && points.length > 1 && (
                  <div className="mt-1 text-xs text-blue-700">النهاية</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length >= 2 && (
          <Polyline positions={polylinePositions} pathOptions={{ color: "#16a34a", weight: 5 }} />
        )}
      </MapContainer>
    </div>
  );
}
