"use client";

import "@/lib/leaflet-patch";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
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

const ZOOM_ON_LOCATION = 16;

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

function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== 0 || lng !== 0) {
      map.flyTo([lat, lng], ZOOM_ON_LOCATION, { duration: 0.8 });
    }
  }, [map, lat, lng]);
  return null;
}

const pinIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ImperativeMarker({
  lat,
  lng,
  visible,
}: {
  lat: number;
  lng: number;
  visible: boolean;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const position: L.LatLngExpression = [lat, lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: pinIcon }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    markerRef.current.getElement()?.toggleAttribute("hidden", !visible);
  }, [map, lat, lng, visible]);

  useEffect(() => {
    return () => {
      if (!markerRef.current) return;
      try {
        // Only remove if map is still in DOM (avoids removeLayer on destroyed map)
        const container = map?.getContainer?.();
        if (container?.parentNode) {
          map.removeLayer(markerRef.current);
        }
      } catch {
        // ignore Leaflet cleanup errors on unmount
      }
      markerRef.current = null;
    };
  }, [map]);

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
  const hasPosition = lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0);
  const position: [number, number] = hasPosition ? [lat, lng] : DEFAULT_CENTER;
  const handleSelect = useCallback(
    (newLat: number, newLng: number) => {
      onSelect(newLat, newLng);
    },
    [onSelect]
  );

  const markerLat = hasPosition ? lat : DEFAULT_CENTER[0];
  const markerLng = hasPosition ? lng : DEFAULT_CENTER[1];

  return (
    <div className="w-full rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={position}
        zoom={hasPosition ? 14 : 10}
        className="h-full w-full"
        style={{ height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={handleSelect} />
        {hasPosition && <MapCenterUpdater lat={lat} lng={lng} />}
        <ImperativeMarker lat={markerLat} lng={markerLng} visible={hasPosition} />
      </MapContainer>
      <p className="text-xs text-muted-foreground text-right mt-1 px-1">
        انقر على الخريطة لتحديد الموقع
      </p>
    </div>
  );
}
