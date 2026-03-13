import type { DashboardEventItem } from "@/lib/types/dashboard-event";
import type { VehicleLiveLocationItem } from "@/lib/services/live-tracking.service";
import { TtlCache } from "./ttl-cache";

const eventSnapshotCache = new TtlCache<DashboardEventItem[]>(3_000);
const vehicleSnapshotCache = new TtlCache<VehicleLiveLocationItem[]>(4_000);

function getEventSnapshotKey(branchId: string, limit: number, skip: number): string {
  return `${branchId}:events:${limit}:${skip}`;
}

function getVehicleSnapshotKey(branchId: string): string {
  return `${branchId}:vehicles`;
}

export async function getCachedEventSnapshot(
  branchId: string,
  limit: number,
  skip: number,
  loader: () => Promise<DashboardEventItem[]>,
): Promise<DashboardEventItem[]> {
  return eventSnapshotCache.getOrLoad(getEventSnapshotKey(branchId, limit, skip), loader);
}

export async function getCachedVehicleSnapshot(
  branchId: string,
  loader: () => Promise<VehicleLiveLocationItem[]>,
): Promise<VehicleLiveLocationItem[]> {
  return vehicleSnapshotCache.getOrLoad(getVehicleSnapshotKey(branchId), loader);
}

export function invalidateEventSnapshots(branchId: string): void {
  eventSnapshotCache.delete(getEventSnapshotKey(branchId, 10, 0));
}

export function invalidateVehicleSnapshot(branchId: string): void {
  vehicleSnapshotCache.delete(getVehicleSnapshotKey(branchId));
}
