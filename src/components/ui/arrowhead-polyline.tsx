"use client";

import { useMemo } from "react";
import { Polyline, Marker } from "react-leaflet";
import L from "leaflet";

const ARROW_SPACING = 3; // place arrow every N segments
const ARROW_SIZE = 10;

function bearing(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const x = Math.sin(dLon) * Math.cos(lat2Rad);
  const y =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const br = (Math.atan2(x, y) * 180) / Math.PI;
  return (br + 360) % 360;
}

function createArrowIcon(angleDeg: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "arrowhead-marker",
    html: `<div style="
      width:0;height:0;
      border-left:${ARROW_SIZE}px solid transparent;
      border-right:${ARROW_SIZE}px solid transparent;
      border-bottom:${ARROW_SIZE * 1.4}px solid ${color};
      transform:rotate(${angleDeg}deg);
    "></div>`,
    iconSize: [ARROW_SIZE * 2, ARROW_SIZE * 2],
    iconAnchor: [ARROW_SIZE, ARROW_SIZE],
  });
}

interface ArrowheadPolylineProps {
  positions: Array<[number, number]>;
  color?: string;
  weight?: number;
  opacity?: number;
}

/**
 * Polyline with direction arrows. Does not use leaflet-arrowheads to avoid
 * _zoom null errors on map unmount.
 */
export function ArrowheadPolyline({
  positions,
  color = "#16a34a",
  weight = 4,
  opacity = 0.9,
}: ArrowheadPolylineProps) {
  const arrowPoints = useMemo(() => {
    if (positions.length < 2) return [];
    const out: { pos: [number, number]; bearing: number }[] = [];
    for (let i = 1; i < positions.length; i += ARROW_SPACING) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const b = bearing(prev, curr);
      out.push({ pos: curr, bearing: (b + 180) % 360 });
    }
    if (positions.length > 1 && out.length === 0) {
      const prev = positions[positions.length - 2];
      const curr = positions[positions.length - 1];
      out.push({ pos: curr, bearing: (bearing(prev, curr) + 180) % 360 });
    }
    return out;
  }, [positions]);

  if (positions.length < 2) return null;

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color, weight, opacity }}
      />
      {arrowPoints.map(({ pos, bearing: b }, i) => (
        <Marker
          key={`arrow-${i}-${pos[0]}-${pos[1]}`}
          position={pos}
          icon={createArrowIcon(b, color)}
          interactive={false}
          zIndexOffset={0}
        />
      ))}
    </>
  );
}
