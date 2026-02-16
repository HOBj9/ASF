"use client";

import "@/lib/leaflet-patch";
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

function orderNumberIcon(num: number, isStart: boolean, isEnd: boolean) {
  let bg = "#16a34a";
  if (isStart) bg = "#059669";
  if (isEnd) bg = "#2563eb";
  return L.divIcon({
    className: "order-marker",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function RoutePreviewMap({
  points,
  geometry,
  interactive,
  onPointSelect,
  selectedStartId,
  selectedEndId,
}: {
  points: PreviewPoint[];
  geometry: PreviewGeometry | null;
  interactive?: boolean;
  onPointSelect?: (pointId: string) => void;
  selectedStartId?: string | null;
  selectedEndId?: string | null;
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

        {points.map((point, index) => {
          const isStart = index === 0;
          const isEnd = index === points.length - 1 && points.length > 1;
          const isSelectedStart = selectedStartId === point._id;
          const isSelectedEnd = selectedEndId === point._id;
          const icon = orderNumberIcon(index + 1, isStart, isEnd);
          return (
            <Marker
              key={point._id}
              position={[point.lat, point.lng]}
              icon={icon}
              eventHandlers={
                interactive && onPointSelect
                  ? { click: () => onPointSelect(point._id) }
                  : undefined
              }
            >
              {(isStart || isEnd) && !interactive && (
                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                  {isStart ? "1 - البداية" : `${points.length} - النهاية`}
                </Tooltip>
              )}
              {interactive && (isSelectedStart || isSelectedEnd) && (
                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                  {isSelectedStart ? "نقطة البداية" : "نقطة النهاية"}
                </Tooltip>
              )}
              <Popup>
                <div className="text-right">
                  <div className="font-medium">
                    {index + 1}. {point.nameAr || point.name || "نقطة"}
                  </div>
                  {isStart && <div className="mt-1 text-xs text-emerald-700">البداية</div>}
                  {isEnd && <div className="mt-1 text-xs text-blue-700">النهاية</div>}
                  {interactive && onPointSelect && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary underline"
                      onClick={() => onPointSelect(point._id)}
                    >
                      اختيار من الخريطة
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {polylinePositions.length >= 2 && (
          <Polyline positions={polylinePositions} pathOptions={{ color: "#16a34a", weight: 5 }} />
        )}
      </MapContainer>
    </div>
  );
}
