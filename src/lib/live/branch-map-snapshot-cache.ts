import type { DashboardMapData } from "@/lib/contracts/dashboard";
import { TtlCache } from "./ttl-cache";

const mapSnapshotCache = new TtlCache<DashboardMapData>(15_000);

function getMapSnapshotKey(branchId: string): string {
  return `${branchId}:dashboard-map-data`;
}

export async function getCachedMapSnapshot(
  branchId: string,
  loader: () => Promise<DashboardMapData>,
): Promise<DashboardMapData> {
  return mapSnapshotCache.getOrLoad(getMapSnapshotKey(branchId), loader);
}

export function invalidateMapSnapshot(branchId: string): void {
  mapSnapshotCache.delete(getMapSnapshotKey(branchId));
}
