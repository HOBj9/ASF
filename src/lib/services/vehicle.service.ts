/**
 * Vehicle Service
 * Business logic for vehicle management
 */

import connectDB from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Branch from '@/models/Branch';
import Route from '@/models/Route';
import TrackingBinding from '@/models/TrackingBinding';
import type { TrackingProvider, ZoneEventProvider } from '@/lib/tracking/types';

export interface CreateVehicleData {
  branchId: string;
  name: string;
  plateNumber?: string;
  imei?: string;
  trackingProvider?: TrackingProvider;
  acceptedTrackingProviders?: TrackingProvider[];
  zoneEventProvider?: ZoneEventProvider | null;
  fuelType?: 'gasoline' | 'diesel';
  fuelPricePerKm?: number;
  atharObjectId?: string;
  driverId?: string;
  routeId?: string;
  isActive?: boolean;
}

export interface UpdateVehicleData {
  name?: string;
  plateNumber?: string;
  imei?: string;
  trackingProvider?: TrackingProvider;
  acceptedTrackingProviders?: TrackingProvider[];
  zoneEventProvider?: ZoneEventProvider | null;
  fuelType?: 'gasoline' | 'diesel';
  fuelPricePerKm?: number | null;
  atharObjectId?: string | null;
  driverId?: string | null;
  routeId?: string | null;
  isActive?: boolean;
}

export class VehicleService {
  private normalizeTrackingProvider(provider?: TrackingProvider | null): TrackingProvider {
    return provider === 'mobile_app' || provider === 'traccar' ? provider : 'athar';
  }

  private normalizeZoneEventProvider(
    provider: ZoneEventProvider | null | undefined,
    fallbackTrackingProvider: TrackingProvider
  ): ZoneEventProvider | null {
    if (provider === 'athar' || provider === 'mobile_app') {
      return provider;
    }
    return fallbackTrackingProvider === 'mobile_app' ? 'mobile_app' : 'athar';
  }

  private normalizeAcceptedTrackingProviders(
    providers: TrackingProvider[] | null | undefined,
    fallbackTrackingProvider: TrackingProvider,
    zoneEventProvider: ZoneEventProvider | null
  ): TrackingProvider[] {
    const normalized = Array.isArray(providers)
      ? providers
          .map((provider) => this.normalizeTrackingProvider(provider))
          .filter(Boolean)
      : [];

    if (!normalized.includes(fallbackTrackingProvider)) {
      normalized.push(fallbackTrackingProvider);
    }
    if (zoneEventProvider && !normalized.includes(zoneEventProvider)) {
      normalized.push(zoneEventProvider);
    }

    return Array.from(new Set(normalized));
  }

  private resolveTrackingPolicy(input: {
    trackingProvider?: TrackingProvider | null;
    acceptedTrackingProviders?: TrackingProvider[] | null;
    zoneEventProvider?: ZoneEventProvider | null;
  }) {
    const trackingProvider = this.normalizeTrackingProvider(input.trackingProvider || 'athar');
    const resolvedZoneEventProvider = this.normalizeZoneEventProvider(
      input.zoneEventProvider,
      trackingProvider
    );
    const acceptedTrackingProviders = this.normalizeAcceptedTrackingProviders(
      input.acceptedTrackingProviders,
      trackingProvider,
      resolvedZoneEventProvider
    );

    return {
      trackingProvider,
      acceptedTrackingProviders,
      zoneEventProvider: resolvedZoneEventProvider,
    };
  }

  private async syncAtharTrackingBinding(vehicle: {
    _id: unknown;
    branchId: unknown;
    imei?: string | null;
    atharObjectId?: string | null;
    trackingProvider?: TrackingProvider | null;
  }): Promise<void> {
    const vehicleId = String(vehicle._id);
    const branchId = String(vehicle.branchId);
    const imei = String(vehicle.imei || '').trim();
    const trackingProvider = this.normalizeTrackingProvider(vehicle.trackingProvider || 'athar');

    if (!imei) {
      await TrackingBinding.updateMany(
        { vehicleId, provider: 'athar' },
        {
          $set: {
            isActive: false,
            isPrimary: false,
            metadata: {
              imei: null,
              atharObjectId: vehicle.atharObjectId || null,
            },
          },
        }
      ).exec();
      return;
    }

    const binding = await TrackingBinding.findOneAndUpdate(
      {
        vehicleId,
        provider: 'athar',
      },
      {
        $set: {
          branchId,
          vehicleId,
          provider: 'athar',
          externalId: String(vehicle.atharObjectId || '').trim() || imei,
          capabilities: ['athar_zone_events', 'athar_live_location'],
          isActive: true,
          isPrimary: trackingProvider === 'athar',
          metadata: {
            imei,
            atharObjectId: vehicle.atharObjectId || null,
          },
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (trackingProvider === 'athar' && binding?._id) {
      await TrackingBinding.updateMany(
        {
          vehicleId,
          _id: { $ne: binding._id },
        },
        {
          $set: {
            isPrimary: false,
          },
        }
      ).exec();
    }
  }

  async create(data: CreateVehicleData): Promise<any> {
    await connectDB();

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const trackingPolicy = this.resolveTrackingPolicy({
      trackingProvider: data.trackingProvider,
      acceptedTrackingProviders: data.acceptedTrackingProviders,
      zoneEventProvider: data.zoneEventProvider,
    });
    const normalizedImei = String(data.imei || '').trim() || null;

    if (trackingPolicy.acceptedTrackingProviders.includes('athar') && !normalizedImei) {
      throw new Error('رقم IMEI مطلوب للمركبات التي تستقبل تتبعاً من أثر');
    }

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId: data.branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
      }
    }

    const vehicle = await Vehicle.create({
      branchId: data.branchId,
      name: data.name,
      plateNumber: data.plateNumber || null,
      imei: normalizedImei,
      trackingProvider: trackingPolicy.trackingProvider,
      acceptedTrackingProviders: trackingPolicy.acceptedTrackingProviders,
      zoneEventProvider: trackingPolicy.zoneEventProvider,
      fuelType: data.fuelType || 'gasoline',
      fuelPricePerKm: data.fuelPricePerKm ?? null,
      atharObjectId: data.atharObjectId || null,
      driverId: data.driverId || null,
      routeId: data.routeId || null,
      isActive: data.isActive ?? true,
    });

    if (data.driverId) {
      await Driver.findByIdAndUpdate(data.driverId, { assignedVehicleId: vehicle._id }).exec();
    }

    await this.syncAtharTrackingBinding(vehicle);

    return vehicle;
  }

  async getAll(branchId: string): Promise<any[]> {
    await connectDB();
    return Vehicle.find({ branchId }).lean().exec();
  }

  async importFromAtharObjects(
    branchId: string,
    objects: Array<{ id: string; imei: string; name?: string; plateNumber?: string | null }>
  ): Promise<{ imported: number; skipped: number }> {
    await connectDB();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    let imported = 0;
    let skipped = 0;

    for (const obj of objects) {
      if (!obj.id || !obj.imei) continue;

      const existing = await Vehicle.findOne({
        branchId,
        $or: [{ imei: obj.imei }, { atharObjectId: obj.id }],
      }).lean();

      if (existing) {
        skipped += 1;
        continue;
      }

      const vehicle = await Vehicle.create({
        branchId,
        name: obj.name || `مركبة أثر ${obj.id}`,
        plateNumber: obj.plateNumber ?? null,
        imei: obj.imei,
        trackingProvider: 'athar',
        acceptedTrackingProviders: ['athar'],
        zoneEventProvider: 'athar',
        fuelType: 'gasoline',
        atharObjectId: obj.id,
        driverId: null,
        routeId: null,
        isActive: true,
      });
      await this.syncAtharTrackingBinding(vehicle);
      imported += 1;
    }

    return { imported, skipped };
  }

  async getById(id: string, branchId: string): Promise<any | null> {
    await connectDB();
    return Vehicle.findOne({ _id: id, branchId }).lean().exec();
  }

  async update(id: string, branchId: string, data: UpdateVehicleData): Promise<any | null> {
    await connectDB();

    const vehicle = await Vehicle.findOne({ _id: id, branchId });
    if (!vehicle) {
      throw new Error('المركبة غير موجودة');
    }

    const prevDriverId = vehicle.driverId?.toString();
    const nextDriverId = data.driverId === undefined ? prevDriverId : data.driverId || null;

    if (data.driverId !== undefined && prevDriverId && prevDriverId !== nextDriverId) {
      await Driver.findByIdAndUpdate(prevDriverId, { assignedVehicleId: null }).exec();
    }

    if (data.driverId && data.driverId !== prevDriverId) {
      await Driver.findByIdAndUpdate(data.driverId, { assignedVehicleId: vehicle._id }).exec();
    }

    const trackingPolicy = this.resolveTrackingPolicy({
      trackingProvider:
        data.trackingProvider || (vehicle.trackingProvider as TrackingProvider | undefined) || 'athar',
      acceptedTrackingProviders:
        data.acceptedTrackingProviders !== undefined
          ? data.acceptedTrackingProviders
          : ((vehicle.acceptedTrackingProviders as TrackingProvider[] | undefined) || undefined),
      zoneEventProvider:
        data.zoneEventProvider !== undefined
          ? data.zoneEventProvider
          : ((vehicle.zoneEventProvider as ZoneEventProvider | null | undefined) ?? undefined),
    });
    const nextImei =
      data.imei === undefined
        ? String(vehicle.imei || '').trim() || null
        : String(data.imei || '').trim() || null;

    if (trackingPolicy.acceptedTrackingProviders.includes('athar') && !nextImei) {
      throw new Error('رقم IMEI مطلوب للمركبات التي تستقبل تتبعاً من أثر');
    }

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    delete (updateData as any).branchId;

    if (data.plateNumber !== undefined && data.plateNumber === '') updateData.plateNumber = null;
    if (data.imei !== undefined) updateData.imei = nextImei;
    if (data.atharObjectId !== undefined && data.atharObjectId === '') updateData.atharObjectId = null;
    if (data.driverId !== undefined && (data.driverId === '' || data.driverId == null)) updateData.driverId = null;
    if (data.routeId !== undefined && (data.routeId === '' || data.routeId == null)) updateData.routeId = null;
    if (data.fuelPricePerKm !== undefined) {
      updateData.fuelPricePerKm = data.fuelPricePerKm == null ? null : Number(data.fuelPricePerKm);
    }

    updateData.trackingProvider = trackingPolicy.trackingProvider;
    updateData.acceptedTrackingProviders = trackingPolicy.acceptedTrackingProviders;
    updateData.zoneEventProvider = trackingPolicy.zoneEventProvider;

    const updated = await Vehicle.findByIdAndUpdate(vehicle._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (updated) {
      await this.syncAtharTrackingBinding(updated);
    }

    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    const vehicle = await Vehicle.findOne({ _id: id, branchId }).lean();
    if (!vehicle) return false;

    if (vehicle.driverId) {
      await Driver.findByIdAndUpdate(vehicle.driverId, { assignedVehicleId: null }).exec();
    }

    await TrackingBinding.updateMany(
      { vehicleId: id },
      {
        $set: {
          isActive: false,
          isPrimary: false,
        },
      }
    ).exec();

    const deleted = await Vehicle.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}
