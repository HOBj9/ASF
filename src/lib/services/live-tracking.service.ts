import connectDB from '@/lib/mongodb';
import Driver from '@/models/Driver';
import Route from '@/models/Route';
import TrackingBinding from '@/models/TrackingBinding';
import TrackingVehicleState from '@/models/TrackingVehicleState';
import Vehicle from '@/models/Vehicle';
import { AtharService } from '@/lib/services/athar.service';
import { isTrackingStateOffline, resolveTrackingConnectivityStatus } from '@/lib/trackingcore/connectivity';
import { resolveAtharProviderConfig } from '@/lib/trackingcore/provider-config';
import type { TrackingProvider } from '@/lib/tracking/types';

export type VehicleLiveLocationItem = {
  id: string;
  provider: TrackingProvider;
  providerLabel: string;
  vehicleName: string;
  plateNumber: string | null;
  busNumber: string;
  driverName: string;
  route: string;
  routeId: string | null;
  status: 'moving' | 'stopped' | 'offline';
  lastUpdate: string;
  lastReceivedAt: string | null;
  lastRecordedAt: string | null;
  passengers: number;
  capacity: number;
  speed: number;
  heading: number;
  accuracy: number | null;
  coordinates: [number, number] | null;
  imei?: string;
  engineStatus?: boolean;
  trackingExternalId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  appVersion?: string | null;
};

function createVehicleLabel(vehicleId: string): string {
  return `مركبة ${vehicleId.slice(-4)}`;
}

function getProviderLabel(provider: TrackingProvider): string {
  if (provider === 'mobile_app') return 'GPS الموبايل';
  if (provider === 'traccar') return 'تراكار';
  return 'أثر';
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
      .select('name plateNumber imei driverId trackingProvider routeId')
      .lean();

    if (!vehicles.length) return [];

    const driverIds = vehicles
      .map((vehicle) => (vehicle.driverId ? String(vehicle.driverId) : null))
      .filter((value): value is string => Boolean(value));
    const routeIds = vehicles
      .map((vehicle) => (vehicle.routeId ? String(vehicle.routeId) : null))
      .filter((value): value is string => Boolean(value));

    const atharVehicles = vehicles.filter(
      (vehicle) => (vehicle.trackingProvider || 'athar') === 'athar' && String(vehicle.imei || '').trim()
    );
    const managedStateVehicles = vehicles.filter(
      (vehicle) => (vehicle.trackingProvider || 'athar') !== 'athar'
    );

    const [drivers, routes, atharService, trackingStates, trackingBindings] = await Promise.all([
      driverIds.length
        ? Driver.find({ _id: { $in: driverIds } }).select('name').lean()
        : Promise.resolve([]),
      routeIds.length
        ? Route.find({ _id: { $in: routeIds } }).select('name').lean()
        : Promise.resolve([]),
      atharVehicles.length ? this.resolveAtharService(branchId) : Promise.resolve(null),
      managedStateVehicles.length
        ? TrackingVehicleState.find({
            branchId,
            vehicleId: { $in: managedStateVehicles.map((vehicle) => vehicle._id) },
          })
            .lean()
            .exec()
        : Promise.resolve([]),
      managedStateVehicles.length
        ? TrackingBinding.find({
            vehicleId: { $in: managedStateVehicles.map((vehicle) => vehicle._id) },
            isPrimary: true,
            isActive: true,
          })
            .select('vehicleId externalId metadata provider')
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const driverMap = new Map(drivers.map((driver) => [String(driver._id), driver.name || 'غير محدد']));
    const routeMap = new Map(routes.map((route) => [String(route._id), route.name || 'غير معين']));

    const locationsByImei =
      atharService && atharVehicles.length
        ? await atharService.getObjectLocations(
            atharVehicles.map((vehicle) => String(vehicle.imei || '').trim()).filter(Boolean)
          )
        : {};

    const trackingStateByVehicleId = new Map(
      trackingStates.map((state) => [String(state.vehicleId), state])
    );
    const bindingByVehicleId = new Map(
      trackingBindings.map((binding) => [String(binding.vehicleId), binding])
    );

    return vehicles.map((vehicle) => {
      const vehicleId = String(vehicle._id);
      const driverName =
        (vehicle.driverId ? driverMap.get(String(vehicle.driverId)) : null) || 'غير محدد';
      const routeName =
        (vehicle.routeId ? routeMap.get(String(vehicle.routeId)) : null) || 'غير معين';
      const routeId = vehicle.routeId ? String(vehicle.routeId) : null;
      const imei = String(vehicle.imei || '').trim() || undefined;
      const provider = (vehicle.trackingProvider || 'athar') as TrackingProvider;
      const vehicleName = vehicle.name || createVehicleLabel(vehicleId);
      const plateNumber = vehicle.plateNumber || null;
      const busNumber = plateNumber || vehicleName || createVehicleLabel(vehicleId);

      if (provider === 'athar') {
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
            id: vehicleId,
            provider,
            providerLabel: getProviderLabel(provider),
            vehicleName,
            plateNumber,
            busNumber,
            driverName,
            route: routeName,
            routeId,
            status,
            lastUpdate: 'تم التحديث مؤخراً',
            lastReceivedAt: null,
            lastRecordedAt: null,
            passengers: 0,
            capacity: 40,
            speed: Number(info.speed || 0),
            heading: Number(info.heading ?? 0),
            accuracy: null,
            coordinates: [Number(info.lat), Number(info.lng)],
            imei,
            engineStatus: !!info.engineStatus,
            trackingExternalId: imei || null,
            deviceName: null,
            platform: null,
            appVersion: null,
          };
        }

        return {
          id: vehicleId,
          provider,
          providerLabel: getProviderLabel(provider),
          vehicleName,
          plateNumber,
          busNumber,
          driverName,
          route: routeName,
          routeId,
          status: 'offline',
          lastUpdate: 'غير متصل',
          lastReceivedAt: null,
          lastRecordedAt: null,
          passengers: 0,
          capacity: 40,
          speed: 0,
          heading: 0,
          accuracy: null,
          coordinates: null,
          imei,
          engineStatus: false,
          trackingExternalId: imei || null,
          deviceName: null,
          platform: null,
          appVersion: null,
        };
      }

      const state = trackingStateByVehicleId.get(vehicleId);
      const binding = bindingByVehicleId.get(vehicleId);
      const metadata = (binding?.metadata || {}) as Record<string, any>;
      const lastReceivedAt = state?.lastReceivedAt ? new Date(state.lastReceivedAt) : null;
      const lastRecordedAt = state?.lastRecordedAt ? new Date(state.lastRecordedAt) : null;
      const offline = isTrackingStateOffline(lastReceivedAt);
      const status = resolveTrackingConnectivityStatus(state?.speed, lastReceivedAt);

      return {
        id: vehicleId,
        provider,
        providerLabel: getProviderLabel(provider),
        vehicleName,
        plateNumber,
        busNumber,
        driverName,
        route: routeName,
        routeId,
        status: offline ? 'offline' : status,
        lastUpdate: offline ? 'غير متصل' : 'تم التحديث مؤخراً',
        lastReceivedAt: lastReceivedAt ? lastReceivedAt.toISOString() : null,
        lastRecordedAt: lastRecordedAt ? lastRecordedAt.toISOString() : null,
        passengers: 0,
        capacity: 40,
        speed: Number(state?.speed || 0),
        heading: Number(state?.heading || 0),
        accuracy: state?.accuracy != null ? Number(state.accuracy) : null,
        coordinates:
          state?.lastLocation &&
          Number.isFinite(Number(state.lastLocation.lat)) &&
          Number.isFinite(Number(state.lastLocation.lng))
            ? [Number(state.lastLocation.lat), Number(state.lastLocation.lng)]
            : null,
        imei,
        engineStatus: !offline && status === 'moving',
        trackingExternalId: binding?.externalId ? String(binding.externalId) : null,
        deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : null,
        platform: typeof metadata.platform === 'string' ? metadata.platform : null,
        appVersion: typeof metadata.appVersion === 'string' ? metadata.appVersion : null,
      };
    });
  }
}
