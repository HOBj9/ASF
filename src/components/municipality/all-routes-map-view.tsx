"use client";

import "@/lib/leaflet-patch";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowheadPolyline } from "@/components/ui/arrowhead-polyline";

const ZOOM_THRESHOLD_FOR_LABELS = 14;

function MapZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tag, Layers } from "lucide-react";
import { Loading } from "@/components/ui/loading";

type RouteMapItem = {
  _id: string;
  name: string;
  color: string;
  path: { type: string; coordinates: number[][] } | null;
  points: Array<{ _id: string; name?: string; nameAr?: string; lat: number; lng: number; order: number }>;
};

function pointIcon(color: string, order: number) {
  return L.divIcon({
    className: "route-point-marker",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:600;font-size:11px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);
    ">${order}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function AllRoutesMapView({
  branchId,
  labels,
}: {
  branchId: string | null;
  labels: { routeLabel?: string; pointLabel?: string };
}) {
  const [routes, setRoutes] = useState<RouteMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPointNames, setShowPointNames] = useState(true);
  const [visibleRouteIds, setVisibleRouteIds] = useState<Set<string>>(new Set());
  const [mapZoom, setMapZoom] = useState(13);

  const loadRoutes = useCallback(async () => {
    if (!branchId) {
      setRoutes([]);
      return;
    }
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/routes/map-data?branchId=${branchId}`);
      const list = res.routes || res.data?.routes || [];
      setRoutes(list);
      setVisibleRouteIds(new Set(list.map((r: RouteMapItem) => r._id)));
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const toggleRouteVisibility = (routeId: string) => {
    setVisibleRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const visibleRoutes = useMemo(
    () => routes.filter((r) => visibleRouteIds.has(r._id)),
    [routes, visibleRouteIds]
  );

  const center: [number, number] = useMemo(() => {
    const allPoints = visibleRoutes.flatMap((r) => r.points);
    if (allPoints.length === 0) return [33.5138, 36.2765];
    const avgLat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;
    return [avgLat, avgLng];
  }, [visibleRoutes]);

  if (!branchId) {
    return (
      <div className="h-[50vh] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        يرجى تحديد {labels.branchLabel || "الفرع"} لعرض الخريطة
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[50vh] rounded-lg border bg-muted/50 flex items-center justify-center">
        <Loading text="جاري تحميل المسارات..." className="min-h-0" />
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="h-[50vh] rounded-lg border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        لا توجد {labels.routeLabel || "مسارات"} لعرضها
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 bg-background">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-point-names"
              checked={showPointNames}
              onCheckedChange={setShowPointNames}
            />
            <Label htmlFor="show-point-names" className="flex items-center gap-1.5 cursor-pointer">
              <Tag className="h-4 w-4" />
              إظهار أسماء {labels.pointLabel || "النقاط"}
            </Label>
            <span className="text-xs text-muted-foreground">
              (تظهر دائمًا عند التكبير، أو عند التمرير على النقطة)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            إظهار/إخفاء {labels.routeLabel || "المسارات"}:
          </div>
          <div className="flex flex-wrap gap-2">
            {routes.map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() => toggleRouteVisibility(r._id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                  visibleRouteIds.has(r._id)
                    ? "border-foreground/30 bg-foreground/10"
                    : "opacity-50 border-muted"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                {r.name}
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadRoutes}>
          تحديث
        </Button>
      </div>

      <div className="h-[60vh] w-full overflow-hidden rounded-lg border">
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <MapZoomTracker onZoomChange={setMapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visibleRoutes.map((route) => {
            const polylinePositions: Array<[number, number]> =
              route.path?.coordinates?.length >= 2
                ? route.path.coordinates.map((c) => [c[1], c[0]]) as Array<[number, number]>
                : route.points
                    .sort((a, b) => a.order - b.order)
                    .map((p) => [p.lat, p.lng] as [number, number]);

            return (
              <ArrowheadPolyline
                key={route._id}
                positions={polylinePositions}
                color={route.color}
                weight={4}
              />
            );
          })}

          {showPointNames &&
            visibleRoutes.map((route) =>
              route.points.map((point, idx) => (
                <Marker
                  key={`${route._id}-${point._id}`}
                  position={[point.lat, point.lng]}
                  icon={pointIcon(route.color, idx + 1)}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -16]}
                    opacity={1}
                    permanent
                  >
                    {point.nameAr || point.name || `${labels.pointLabel || "نقطة"} ${idx + 1}`}
                  </Tooltip>
                  <Popup>
                    <div className="text-right">
                      <div className="font-medium">{point.nameAr || point.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {route.name} — {idx + 1} / {route.points.length}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
        </MapContainer>
      </div>
    </div>
  );
}
