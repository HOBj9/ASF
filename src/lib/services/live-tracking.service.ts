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

function normalizeTrackingProvider(provider?: TrackingProvider | null): TrackingProvider {
  if (provider === 'mobile_app' || provider === 'traccar') return provider;
  return 'athar';
}

function normalizeAcceptedProviders(vehicle: {
  trackingProvider?: TrackingProvider | null;
  acceptedTrackingProviders?: TrackingProvider[] | null;
}): TrackingProvider[] {
  if (Array.isArray(vehicle.acceptedTrackingProviders) && vehicle.acceptedTrackingProviders.length > 0) {
    return Array.from(
      new Set(vehicle.acceptedTrackingProviders.map((provider) => normalizeTrackingProvider(provider)))
    );
  }

  return [normalizeTrackingProvider(vehicle.trackingProvider)];
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

  private buildAtharItem(input: {
    vehicleId: string;
    provider: TrackingProvider;
    vehicleName: string;
    plateNumber: string | null;
    busNumber: string;
    driverName: string;
    routeName: string;
    routeId: string | null;
    imei?: string;
    info?: {
      lat?: number | null;
      lng?: number | null;
      speed?: number | null;
      heading?: number | null;
      engineStatus?: boolean | null;
    } | null;
  }): VehicleLiveLocationItem {
    const hasCoordinates =
      input.info &&
      input.info.lat !== null &&
      input.info.lng !== null &&
      Number.isFinite(Number(input.info.lat)) &&
      Number.isFinite(Number(input.info.lng));

    if (hasCoordinates) {
      const status: VehicleLiveLocationItem['status'] = input.info?.engineStatus ? 'moving' : 'stopped';
      return {
        id: input.vehicleId,
        provider: input.provider,
        providerLabel: getProviderLabel(input.provider),
        vehicleName: input.vehicleName,
        plateNumber: input.plateNumber,
        busNumber: input.busNumber,
        driverName: input.driverName,
        route: input.routeName,
        routeId: input.routeId,
        status,
        lastUpdate: 'تم التحديث مؤخراً',
        lastReceivedAt: null,
        lastRecordedAt: null,
        passengers: 0,
        capacity: 40,
        speed: Number(input.info?.speed || 0),
        heading: Number(input.info?.heading ?? 0),
        accuracy: null,
        coordinates: [Number(input.info?.lat), Number(input.info?.lng)],
        imei: input.imei,
        engineStatus: Boolean(input.info?.engineStatus),
        trackingExternalId: input.imei || null,
        deviceName: null,
        platform: null,
        appVersion: null,
      };
    }

    return {
      id: input.vehicleId,
      provider: input.provider,
      providerLabel: getProviderLabel(input.provider),
      vehicleName: input.vehicleName,
      plateNumber: input.plateNumber,
      busNumber: input.busNumber,
      driverName: input.driverName,
      route: input.routeName,
      routeId: input.routeId,
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
      imei: input.imei,
      engineStatus: false,
      trackingExternalId: input.imei || null,
      deviceName: null,
      platform: null,
      appVersion: null,
    };
  }

  private buildManagedStateItem(input: {
    vehicleId: string;
    provider: TrackingProvider;
    vehicleName: string;
    plateNumber: string | null;
    busNumber: string;
    driverName: string;
    routeName: string;
    routeId: string | null;
    imei?: string;
    state?: any;
    binding?: any;
  }): VehicleLiveLocationItem {
    const metadata = (input.binding?.metadata || {}) as Record<string, any>;
    const lastReceivedAt = input.state?.lastReceivedAt ? new Date(input.state.lastReceivedAt) : null;
    const lastRecordedAt = input.state?.lastRecordedAt ? new Date(input.state.lastRecordedAt) : null;
    const offline = isTrackingStateOffline(lastReceivedAt);
    const status = resolveTrackingConnectivityStatus(input.state?.speed, lastReceivedAt);

    return {
      id: input.vehicleId,
      provider: input.provider,
      providerLabel: getProviderLabel(input.provider),
      vehicleName: input.vehicleName,
      plateNumber: input.plateNumber,
      busNumber: input.busNumber,
      driverName: input.driverName,
      route: input.routeName,
      routeId: input.routeId,
      status: offline ? 'offline' : status,
      lastUpdate: offline ? 'غير متصل' : 'تم التحديث مؤخراً',
      lastReceivedAt: lastReceivedAt ? lastReceivedAt.toISOString() : null,
      lastRecordedAt: lastRecordedAt ? lastRecordedAt.toISOString() : null,
      passengers: 0,
      capacity: 40,
      speed: Number(input.state?.speed || 0),
      heading: Number(input.state?.heading || 0),
      accuracy: input.state?.accuracy != null ? Number(input.state.accuracy) : null,
      coordinates:
        input.state?.lastLocation &&
        Number.isFinite(Number(input.state.lastLocation.lat)) &&
        Number.isFinite(Number(input.state.lastLocation.lng))
          ? [Number(input.state.lastLocation.lat), Number(input.state.lastLocation.lng)]
          : null,
      imei: input.imei,
      engineStatus: !offline && status === 'moving',
      trackingExternalId: input.binding?.externalId ? String(input.binding.externalId) : null,
      deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : null,
      platform: typeof metadata.platform === 'string' ? metadata.platform : null,
      appVersion: typeof metadata.appVersion === 'string' ? metadata.appVersion : null,
    };
  }

  async getBranchVehicleLocations(branchId: string): Promise<VehicleLiveLocationItem[]> {
    await connectDB();

    const vehicles = await Vehicle.find({
      branchId,
      isActive: true,
    })
      .select('name plateNumber imei driverId trackingProvider acceptedTrackingProviders routeId')
      .lean();

    if (!vehicles.length) return [];

    const driverIds = vehicles
      .map((vehicle) => (vehicle.driverId ? String(vehicle.driverId) : null))
      .filter((value): value is string => Boolean(value));
    const routeIds = vehicles
      .map((vehicle) => (vehicle.routeId ? String(vehicle.routeId) : null))
      .filter((value): value is string => Boolean(value));

    const atharVehicles = vehicles.filter((vehicle) => {
      const acceptedProviders = normalizeAcceptedProviders(vehicle);
      return acceptedProviders.includes('athar') && String(vehicle.imei || '').trim();
    });

    const [drivers, routes, atharService, trackingStates, trackingBindings] = await Promise.all([
      driverIds.length
        ? Driver.find({ _id: { $in: driverIds } }).select('name').lean()
        : Promise.resolve([]),
      routeIds.length
        ? Route.find({ _id: { $in: routeIds } }).select('name').lean()
        : Promise.resolve([]),
      atharVehicles.length ? this.resolveAtharService(branchId) : Promise.resolve(null),
      TrackingVehicleState.find({
        branchId,
        vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) },
      })
        .lean()
        .exec(),
      TrackingBinding.find({
        vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) },
        isPrimary: true,
        isActive: true,
      })
        .select('vehicleId externalId metadata provider lastSeenAt')
        .lean()
        .exec(),
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
      const vehicleName = vehicle.name || createVehicleLabel(vehicleId);
      const plateNumber = vehicle.plateNumber || null;
      const busNumber = plateNumber || vehicleName || createVehicleLabel(vehicleId);
      const binding = bindingByVehicleId.get(vehicleId);
      const state = trackingStateByVehicleId.get(vehicleId);
      const managedProvider = normalizeTrackingProvider(state?.provider || binding?.provider || null);
      const lastReceivedAt = state?.lastReceivedAt ? new Date(state.lastReceivedAt) : null;
      const managedHasCoordinates =
        state?.lastLocation &&
        Number.isFinite(Number(state.lastLocation.lat)) &&
        Number.isFinite(Number(state.lastLocation.lng));
      const managedIsRecent = !isTrackingStateOffline(lastReceivedAt);
      const acceptedProviders = normalizeAcceptedProviders(vehicle);
      const atharInfo = imei && acceptedProviders.includes('athar') ? locationsByImei[imei] : null;
      const atharHasCoordinates =
        atharInfo &&
        atharInfo.lat !== null &&
        atharInfo.lng !== null &&
        Number.isFinite(Number(atharInfo.lat)) &&
        Number.isFinite(Number(atharInfo.lng));

      const shouldUseManagedState =
        (managedProvider !== 'athar' && (managedHasCoordinates || managedIsRecent)) ||
        (managedProvider !== 'athar' && !atharHasCoordinates && Boolean(binding || state));

      if (shouldUseManagedState) {
        return this.buildManagedStateItem({
          vehicleId,
          provider: managedProvider,
          vehicleName,
          plateNumber,
          busNumber,
          driverName,
          routeName,
          routeId,
          imei,
          state,
          binding,
        });
      }

      if (atharHasCoordinates || normalizeTrackingProvider(vehicle.trackingProvider) === 'athar') {
        return this.buildAtharItem({
          vehicleId,
          provider: 'athar',
          vehicleName,
          plateNumber,
          busNumber,
          driverName,
          routeName,
          routeId,
          imei,
          info: atharInfo || null,
        });
      }

      return this.buildManagedStateItem({
        vehicleId,
        provider: managedProvider,
        vehicleName,
        plateNumber,
        busNumber,
        driverName,
        routeName,
        routeId,
        imei,
        state,
        binding,
      });
    });
  }
}
