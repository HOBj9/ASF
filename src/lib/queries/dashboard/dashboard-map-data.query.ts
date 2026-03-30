import { AtharService } from "@/lib/services/athar.service";
import { PointService } from "@/lib/services/point.service";
import { VehicleService } from "@/lib/services/vehicle.service";
import type {
  DashboardAtharMarker,
  DashboardAtharObject,
  DashboardAtharZone,
  DashboardMapData,
  DashboardMapPoint,
  DashboardVehicleSummary,
} from "@/lib/contracts/dashboard";
import { measureAsync } from "@/lib/observability/perf";

const pointService = new PointService();
const vehicleService = new VehicleService();

function parseZoneVertices(zoneVertices?: string): Array<{ lat: number; lng: number }> {
  if (!zoneVertices || typeof zoneVertices !== "string") return [];
  const parts = zoneVertices
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
  const vertices: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    vertices.push({ lat: parts[i], lng: parts[i + 1] });
  }
  return vertices;
}

function normalizeZones(rawZones: Array<Record<string, any>>): DashboardAtharZone[] {
  return rawZones.reduce<DashboardAtharZone[]>((zones, z) => {
      const idRaw = z.zone_id ?? z.id ?? z._id;
      if (idRaw == null || idRaw === "") return zones;
      const id = String(idRaw);
      const name = String(z.name ?? z.title ?? `Zone ${id}`);
      const color = typeof z.color === "string" && z.color.trim() ? z.color.trim() : undefined;
      const center = PointService.zoneToCenter(z);
      const vertices = parseZoneVertices(z.zone_vertices ?? z.zoneVertices ?? z.vertices);
      zones.push({ id, name, color, center, vertices });
      return zones;
    }, []);
}

function normalizeObject(obj: Record<string, any>, index: number): DashboardAtharObject {
  const latNum = Number(obj.lat ?? obj.latitude);
  const lngNum = Number(obj.lng ?? obj.longitude);
  const speedNum = Number(obj.speed ?? obj.params?.speed ?? 0);
  const angleNum = Number(obj.angle ?? obj.course ?? obj.params?.angle ?? obj.params?.course ?? 0);

  return {
    id: String(obj.id ?? obj.object_id ?? obj.objectId ?? obj.imei ?? index),
    imei: String(obj.imei ?? ""),
    name: String(obj.name ?? obj.object_name ?? `Object ${index + 1}`),
    plateNumber: obj.plate_number ? String(obj.plate_number) : null,
    lat: Number.isFinite(latNum) ? latNum : null,
    lng: Number.isFinite(lngNum) ? lngNum : null,
    speed: Number.isFinite(speedNum) ? speedNum : 0,
    angle: Number.isFinite(angleNum) ? angleNum : 0,
    active: String(obj.active ?? "").toLowerCase() === "true" || String(obj.loc_valid ?? "") === "1",
    dtTracker: obj.dt_tracker ? String(obj.dt_tracker) : null,
    dtServer: obj.dt_server ? String(obj.dt_server) : null,
    model: obj.model ? String(obj.model) : null,
    device: obj.device ? String(obj.device) : null,
    raw: obj,
  };
}

export async function getDashboardMapData(branchId: string): Promise<DashboardMapData> {
  return measureAsync(
    "dashboard.getMapData",
    async () => {
      const [points, vehicles, atharService] = await Promise.all([
        pointService.getAll(branchId),
        vehicleService.getAll(branchId),
        AtharService.forBranch(branchId).catch(() => null),
      ]);

      const [markers, zonesRaw, objectsRaw] = atharService
        ? await Promise.all([
            atharService.getMarkers().catch(() => []),
            atharService.getZones().catch(() => []),
            atharService.getObjects().catch(() => []),
          ])
        : [[], [], []];

      return {
        points: (points as any[]).map(
          (point): DashboardMapPoint => ({
            _id: String(point._id),
            name: point.name,
            nameAr: point.nameAr,
            lat: point.lat,
            lng: point.lng,
            radiusMeters: point.radiusMeters,
            type: point.type,
            zoneId: point.zoneId,
            addressText: point.addressText,
            isActive: point.isActive,
          }),
        ),
        markers: markers as DashboardAtharMarker[],
        zones: normalizeZones(zonesRaw as Array<Record<string, any>>),
        objects: (objectsRaw as Array<Record<string, any>>).map((obj, index) => normalizeObject(obj, index)),
        vehicles: (vehicles as any[]).map(
          (vehicle): DashboardVehicleSummary => ({
            _id: String(vehicle._id),
            name: vehicle.name,
            plateNumber: vehicle.plateNumber,
            imei: vehicle.imei,
            atharObjectId: vehicle.atharObjectId,
            routeId: vehicle.routeId ? String(vehicle.routeId) : null,
            isActive: vehicle.isActive,
          }),
        ),
      };
    },
    { meta: { branchId } },
  );
}
