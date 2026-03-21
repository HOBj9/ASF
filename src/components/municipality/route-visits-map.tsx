"use client";

import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-patch";
import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Route, MapPin } from "lucide-react";
import { ArrowheadPolyline } from "@/components/ui/arrowhead-polyline";

export type RouteVisitPoint = {
  pointId: string;
  lat: number;
  lng: number;
  order: number;
  name?: string;
  nameAr?: string;
};

export interface VisitOrderAnalysis {
  inOrder: boolean;
  actualOrder: string[];
  expectedOrder: string[];
  outOfOrderPoints: string[];
}

type PathMode = "original" | "actual";

function pointIcon(visited: boolean, order: number) {
  const color = visited ? "#22c55e" : "#ef4444";
  return L.divIcon({
    className: "route-visit-marker",
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:600;font-size:11px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);
    ">${order}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** GeoJSON LineString: coordinates are [lng, lat] */
type PathGeometry = { type: "LineString"; coordinates: number[][] };

export function RouteVisitsMap({
  points,
  visitedPointIds,
  orderAnalysis,
  routeColor = "#16a34a",
  pointLabel = "نقطة",
  pathGeometry,
}: {
  points: RouteVisitPoint[];
  visitedPointIds: string[];
  orderAnalysis?: VisitOrderAnalysis | null;
  routeColor?: string;
  pointLabel?: string;
  /** Optional: route path along roads (GeoJSON [lng,lat]). When set, "المسار الأصلي" uses this instead of straight segments. */
  pathGeometry?: PathGeometry | null;
}) {
  const [pathMode, setPathMode] = useState<PathMode>("original");
  const visitedSet = useMemo(() => new Set(visitedPointIds), [visitedPointIds]);

  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.order - b.order),
    [points]
  );

  const center: [number, number] = useMemo(() => {
    if (points.length === 0) return [33.5138, 36.2765];
    const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return [avgLat, avgLng];
  }, [points]);

  const expectedPositions: Array<[number, number]> = useMemo(() => {
    const pointMap = new Map(points.map((p) => [p.pointId, [p.lat, p.lng] as [number, number]]));
    return (orderAnalysis?.expectedOrder ?? sortedPoints.map((p) => p.pointId))
      .map((id) => pointMap.get(id))
      .filter(Boolean) as Array<[number, number]>;
  }, [points, orderAnalysis?.expectedOrder, sortedPoints]);

  /** Original path: use stored path geometry (along roads) when available, else point-to-point. */
  const originalPathPositions: Array<[number, number]> = useMemo(() => {
    if (pathGeometry?.type === "LineString" && Array.isArray(pathGeometry.coordinates) && pathGeometry.coordinates.length >= 2) {
      return pathGeometry.coordinates.map((c) => [Number(c[1]), Number(c[0])] as [number, number]);
    }
    return expectedPositions;
  }, [pathGeometry, expectedPositions]);

  const actualPositions: Array<[number, number]> = useMemo(() => {
    const pointMap = new Map(points.map((p) => [p.pointId, [p.lat, p.lng] as [number, number]]));
    return (orderAnalysis?.actualOrder ?? [])
      .map((id) => pointMap.get(id))
      .filter(Boolean) as Array<[number, number]>;
  }, [points, orderAnalysis?.actualOrder]);

  const hasOrderAnalysis = orderAnalysis && actualPositions.length >= 2;

  if (points.length === 0) {
    return (
      <div className="h-[40vh] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        لا توجد {pointLabel} لعرضها
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">عرض المسار:</span>
        <Button
          variant={pathMode === "original" ? "default" : "outline"}
          size="sm"
          onClick={() => setPathMode("original")}
          className="gap-1.5"
        >
          <MapPin className="h-4 w-4" />
          المسار الأصلي
        </Button>
        {hasOrderAnalysis && (
          <Button
            variant={pathMode === "actual" ? "default" : "outline"}
            size="sm"
            onClick={() => setPathMode("actual")}
            className="gap-1.5"
          >
            <Route className="h-4 w-4" />
            مسار المركبة الفعلي
          </Button>
        )}
      </div>

      <div className="h-[40vh] w-full overflow-hidden rounded-lg border">
        <MapContainer center={center} zoom={14} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {(pathMode === "original" || !hasOrderAnalysis) && originalPathPositions.length >= 2 && (
            <ArrowheadPolyline
              positions={originalPathPositions}
              color={routeColor}
              weight={4}
              opacity={0.9}
            />
          )}

          {pathMode === "actual" && hasOrderAnalysis && (
            <ArrowheadPolyline
              positions={actualPositions}
              color={orderAnalysis!.inOrder ? "#22c55e" : "#f59e0b"}
              weight={4}
              opacity={0.9}
            />
          )}

          {sortedPoints.map((point) => {
            const displayNumber = point.order + 1;
            return (
              <Marker
                key={point.pointId}
                position={[point.lat, point.lng]}
                icon={pointIcon(visitedSet.has(point.pointId), displayNumber)}
              >
                <Tooltip direction="top" offset={[0, -16]} opacity={1} permanent>
                  <span className="font-medium">{displayNumber}. </span>
                  {point.nameAr || point.name || `${pointLabel} ${displayNumber}`}
                  {visitedSet.has(point.pointId) ? " ✓" : " ✗"}
                </Tooltip>
                <Popup>
                  <div className="text-right">
                    <div className="font-medium">
                      {displayNumber}. {point.nameAr || point.name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {visitedSet.has(point.pointId) ? "مزارة" : "غير مزارة"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
