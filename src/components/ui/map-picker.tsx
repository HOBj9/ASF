"use client";

import "@/lib/leaflet-patch";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER: [number, number] = [33.5138, 36.2765];

// Fallback when Next/build doesn't provide .src (e.g. Docker/production) — avoid "iconUrl not set"
const FALLBACK_PIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 41' width='25' height='41'%3E%3Cpath fill='%232a7fff' stroke='%23fff' stroke-width='1.5' d='M12.5 0C5.6 0 0 5.6 0 12.5 0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z'/%3E%3Ccircle fill='%23fff' cx='12.5' cy='12.5' r='5'/%3E%3C/svg%3E";

const iconUrl = typeof markerIcon?.src === "string" ? markerIcon.src : FALLBACK_PIN_SVG;
const iconRetinaUrl = typeof markerIcon2x?.src === "string" ? markerIcon2x.src : iconUrl;
const shadowUrl = typeof markerShadow?.src === "string" ? markerShadow.src : undefined;

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl,
  shadowUrl: shadowUrl ?? "",
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

const pinIcon =
  iconUrl &&
  L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl: shadowUrl || undefined,
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
      markerRef.current = L.marker(position, pinIcon ? { icon: pinIcon } : {}).addTo(map);
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
  showHint = true,
}: {
  lat: number;
  lng: number;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
  /** When false, hides the "click to set location" hint (e.g. for read-only view) */
  showHint?: boolean;
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
        {showHint && <MapClickHandler onSelect={handleSelect} />}
        {hasPosition && <MapCenterUpdater lat={lat} lng={lng} />}
        <ImperativeMarker lat={markerLat} lng={markerLng} visible={hasPosition} />
      </MapContainer>
      {showHint && (
        <p className="text-xs text-muted-foreground text-right mt-1 px-1">
          انقر على الخريطة لتحديد الموقع
        </p>
      )}
    </div>
  );
}
