import connectDB from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import TrackingVehicleState from '@/models/TrackingVehicleState';
import { AtharService } from '@/lib/services/athar.service';
import { isTrackingStateOffline, resolveTrackingConnectivityStatus } from '@/lib/trackingcore/connectivity';
import { resolveAtharProviderConfig } from '@/lib/trackingcore/provider-config';

export type VehicleLiveLocationItem = {
  id: string;
  busNumber: string;
  driverName: string;
  route: string;
  status: 'moving' | 'stopped' | 'offline';
  lastUpdate: string;
  passengers: number;
  capacity: number;
  speed: number;
  heading: number;
  coordinates: [number, number] | null;
  imei?: string;
  engineStatus?: boolean;
};

function createVehicleLabel(vehicleId: string): string {
  return `مركبة ${vehicleId.slice(-4)}`;
}

export class LiveTrackingService {
  private async resolveAtharService(branchId: string): Promise<AtharService | null> {
    const resolvedConfig = await resolveAtharProviderConfig(branchId);
    if (!resolvedConfig?.apiKey) {
      return null;
    }

    return new AtharService({
      baseUrl: resolvedConfig.baseUrl,
      apiKey: resolvedConfig.apiKey,
      api: resolvedConfig.api,
      version: resolvedConfig.version,
    });
  }

  async getBranchVehicleLocations(branchId: string): Promise<VehicleLiveLocationItem[]> {
    await connectDB();

    const vehicles = await Vehicle.find({
      branchId,
      isActive: true,
    })
      .select('name plateNumber imei driverId trackingProvider')
      .lean();

    if (!vehicles.length) return [];

    const driverIds = vehicles
      .map((vehicle) => (vehicle.driverId ? String(vehicle.driverId) : null))
      .filter((value): value is string => Boolean(value));

    const driverMap = new Map<string, string>();
    if (driverIds.length) {
      const drivers = await Driver.find({ _id: { $in: driverIds } }).select('name').lean();
      for (const driver of drivers) {
        driverMap.set(String(driver._id), driver.name || 'غير محدد');
      }
    }

    const atharVehicles = vehicles.filter(
      (vehicle) => (vehicle.trackingProvider || 'athar') === 'athar' && String(vehicle.imei || '').trim()
    );
    const managedStateVehicles = vehicles.filter(
      (vehicle) => (vehicle.trackingProvider || 'athar') !== 'athar'
    );

    const [atharService, trackingStates] = await Promise.all([
      atharVehicles.length ? this.resolveAtharService(branchId) : Promise.resolve(null),
      managedStateVehicles.length
        ? TrackingVehicleState.find({
            branchId,
            vehicleId: { $in: managedStateVehicles.map((vehicle) => vehicle._id) },
          })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const locationsByImei =
      atharService && atharVehicles.length
        ? await atharService.getObjectLocations(
            atharVehicles.map((vehicle) => String(vehicle.imei || '').trim()).filter(Boolean)
          )
        : {};
    const trackingStateByVehicleId = new Map(
      trackingStates.map((state) => [String(state.vehicleId), state])
    );

    return vehicles.map((vehicle) => {
      const driverName =
        (vehicle.driverId ? driverMap.get(String(vehicle.driverId)) : null) || 'غير محدد';
      const imei = String(vehicle.imei || '').trim() || undefined;
      const trackingProvider = vehicle.trackingProvider || 'athar';

      if (trackingProvider === 'athar') {
        const info = imei ? locationsByImei[imei] : null;
        const hasCoordinates =
          info &&
          info.lat !== null &&
          info.lng !== null &&
          Number.isFinite(info.lat) &&
          Number.isFinite(info.lng);

        if (hasCoordinates) {
          const status: VehicleLiveLocationItem['status'] = info.engineStatus ? 'moving' : 'stopped';
          return {
            id: String(vehicle._id),
            busNumber: vehicle.plateNumber || vehicle.name || createVehicleLabel(String(vehicle._id)),
            driverName,
            route: 'غير محدد',
            status,
            lastUpdate: 'منذ لحظات',
            passengers: 0,
            capacity: 40,
            speed: Number(info.speed || 0),
            heading: Number(info.heading ?? 0),
            coordinates: [Number(info.lat), Number(info.lng)],
            imei,
            engineStatus: !!info.engineStatus,
          };
        }

        return {
          id: String(vehicle._id),
          busNumber: vehicle.plateNumber || vehicle.name || createVehicleLabel(String(vehicle._id)),
          driverName,
          route: 'غير محدد',
          status: 'offline',
          lastUpdate: 'غير متصل',
          passengers: 0,
          capacity: 40,
          speed: 0,
          heading: 0,
          coordinates: null,
          imei,
          engineStatus: false,
        };
      }

      const state = trackingStateByVehicleId.get(String(vehicle._id));
      const lastReceivedAt = state?.lastReceivedAt ? new Date(state.lastReceivedAt) : null;
      const offline = isTrackingStateOffline(lastReceivedAt);
      const status = resolveTrackingConnectivityStatus(state?.speed, lastReceivedAt);

      return {
        id: String(vehicle._id),
        busNumber: vehicle.plateNumber || vehicle.name || createVehicleLabel(String(vehicle._id)),
        driverName,
        route: 'غير محدد',
        status: offline ? 'offline' : status,
        lastUpdate: offline ? 'غير متصل' : 'منذ لحظات',
        passengers: 0,
        capacity: 40,
        speed: Number(state?.speed || 0),
        heading: Number(state?.heading || 0),
        coordinates:
          state?.lastLocation &&
          Number.isFinite(Number(state.lastLocation.lat)) &&
          Number.isFinite(Number(state.lastLocation.lng))
            ? [Number(state.lastLocation.lat), Number(state.lastLocation.lng)]
            : null,
        imei,
        engineStatus: !offline && status === 'moving',
      };
    });
  }
}
