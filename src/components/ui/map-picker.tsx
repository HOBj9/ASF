"use client";

import { useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER: [number, number] = [33.5138, 36.2765];

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onSelect(lat, lng);
    },
  });
  return null;
}

export function MapPicker({
  lat,
  lng,
  onSelect,
  height = "240px",
}: {
  lat: number;
  lng: number;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
}) {
  const position: [number, number] =
    lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)
      ? [lat, lng]
      : DEFAULT_CENTER;
  const handleSelect = useCallback(
    (newLat: number, newLng: number) => {
      onSelect(newLat, newLng);
    },
    [onSelect]
  );

  return (
    <div className="w-full rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={position}
        zoom={lat !== 0 || lng !== 0 ? 14 : 10}
        className="h-full w-full"
        style={{ height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={handleSelect} />
        {(lat !== 0 || lng !== 0) && <Marker position={[lat, lng]} />}
      </MapContainer>
      <p className="text-xs text-muted-foreground text-right mt-1 px-1">
        انقر على الخريطة لتحديد الموقع
      </p>
    </div>
  );
}
