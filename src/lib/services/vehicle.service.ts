/**
 * Vehicle Service
 * Business logic for vehicle management
 */

import connectDB from '@/lib/mongodb';
import Vehicle, { IVehicle } from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Branch from '@/models/Branch';
import Route from '@/models/Route';
import RoutePoint from '@/models/RoutePoint';
import Point from '@/models/Point';
import TrackingBinding from '@/models/TrackingBinding';
import { AtharService } from '@/lib/services/athar.service';
import { isAtharProviderEnabledForBranch } from '@/lib/trackingcore/provider-config';
import type { TrackingProvider } from '@/lib/tracking/types';

export interface CreateVehicleData {
  branchId: string;
  name: string;
  plateNumber?: string;
  imei?: string;
  trackingProvider?: TrackingProvider;
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
  fuelType?: 'gasoline' | 'diesel';
  fuelPricePerKm?: number | null;
  atharObjectId?: string | null;
  driverId?: string | null;
  routeId?: string | null;
  isActive?: boolean;
}

export class VehicleService {
  private getWebhookUrl(): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    return `${base}/api/athar/webhook`;
  }

  private normalizeTrackingProvider(provider?: TrackingProvider | null): TrackingProvider {
    return provider === 'mobile_app' || provider === 'traccar' ? provider : 'athar';
  }

  private async shouldUseAtharForVehicle(
    branchId: string,
    trackingProvider: TrackingProvider,
    imei?: string | null
  ): Promise<boolean> {
    if (trackingProvider !== 'athar') return false;
    if (!String(imei || '').trim()) return false;
    return isAtharProviderEnabledForBranch(branchId);
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

  private async createAtharRouteEventsForVehicle(
    branchId: string,
    routeId: string,
    imei: string
  ): Promise<void> {
    if (!(await this.shouldUseAtharForVehicle(branchId, 'athar', imei))) {
      return;
    }

    const routePoints = await RoutePoint.find({ routeId })
      .sort({ order: 1 })
      .select('pointId order')
      .lean();

    if (!routePoints.length) return;

    const pointIds = routePoints.map((rp) => rp.pointId);
    const points = await Point.find({
      _id: { $in: pointIds },
      branchId,
      zoneId: { $ne: null },
      isActive: true,
    })
      .select('name nameAr nameEn zoneId')
      .lean();

    const pointById = new Map(points.map((p) => [String(p._id), p]));
    const atharService = await AtharService.forBranch(branchId);
    const webhookUrl = this.getWebhookUrl();

    for (const rp of routePoints) {
      const point = pointById.get(String(rp.pointId));
      if (!point?.zoneId) continue;

      const pointName = point.nameAr || point.nameEn || point.name || 'Point';
      await atharService.createZoneEvent(pointName, point.zoneId, imei, 'zone_in', webhookUrl);
      await atharService.createZoneEvent(pointName, point.zoneId, imei, 'zone_out', webhookUrl);
    }
  }

  async create(data: CreateVehicleData): Promise<any> {
    await connectDB();

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const trackingProvider = this.normalizeTrackingProvider(data.trackingProvider);
    const normalizedImei = String(data.imei || '').trim() || null;

    if (trackingProvider === 'athar' && !normalizedImei) {
      throw new Error('رقم IMEI مطلوب للمركبات التي تستخدم أثر');
    }

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId: data.branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
      }

      if (await this.shouldUseAtharForVehicle(data.branchId, trackingProvider, normalizedImei)) {
        await this.createAtharRouteEventsForVehicle(data.branchId, data.routeId, normalizedImei || '');
      }
    }

    const vehicle = await Vehicle.create({
      branchId: data.branchId,
      name: data.name,
      plateNumber: data.plateNumber || null,
      imei: normalizedImei,
      trackingProvider,
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

  /**
   * Import vehicles from Athar objects (no Athar API calls).
   * Skips objects that already have a vehicle in this branch with same imei or atharObjectId.
   */
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
    const nextDriverId =
      data.driverId === undefined ? prevDriverId : data.driverId || null;

    if (data.driverId !== undefined && prevDriverId && prevDriverId !== nextDriverId) {
      await Driver.findByIdAndUpdate(prevDriverId, { assignedVehicleId: null }).exec();
    }

    if (data.driverId && data.driverId !== prevDriverId) {
      await Driver.findByIdAndUpdate(data.driverId, { assignedVehicleId: vehicle._id }).exec();
    }

    const nextTrackingProvider = this.normalizeTrackingProvider(
      data.trackingProvider || (vehicle.trackingProvider as TrackingProvider | undefined) || 'athar'
    );
    const nextImei =
      data.imei === undefined
        ? String(vehicle.imei || '').trim() || null
        : String(data.imei || '').trim() || null;

    if (nextTrackingProvider === 'athar' && !nextImei) {
      throw new Error('رقم IMEI مطلوب للمركبات التي تستخدم أثر');
    }

    const updateData: any = { ...data };
    delete updateData.branchId;
    if (data.plateNumber !== undefined && data.plateNumber === '') updateData.plateNumber = null;
    if (data.imei !== undefined) updateData.imei = nextImei;
    if (data.trackingProvider !== undefined) updateData.trackingProvider = nextTrackingProvider;
    if (data.atharObjectId !== undefined && data.atharObjectId === '') updateData.atharObjectId = null;
    if (data.driverId !== undefined && (data.driverId === '' || data.driverId == null)) updateData.driverId = null;
    if (data.routeId !== undefined && (data.routeId === '' || data.routeId == null)) updateData.routeId = null;
    if (data.fuelPricePerKm !== undefined) {
      updateData.fuelPricePerKm = data.fuelPricePerKm == null
        ? null
        : Number(data.fuelPricePerKm);
    }

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
      }

      const nextRouteId = String(data.routeId);
      const prevRouteId = vehicle.routeId ? String(vehicle.routeId) : null;
      if (
        prevRouteId !== nextRouteId &&
        (await this.shouldUseAtharForVehicle(branchId, nextTrackingProvider, nextImei))
      ) {
        await this.createAtharRouteEventsForVehicle(branchId, nextRouteId, nextImei || '');
      }
    }

    if (
      vehicle.routeId &&
      (data.routeId === undefined || String(data.routeId) === String(vehicle.routeId)) &&
      (data.imei !== undefined || data.trackingProvider !== undefined) &&
      (nextImei !== String(vehicle.imei || '').trim() ||
        nextTrackingProvider !==
          this.normalizeTrackingProvider(vehicle.trackingProvider as TrackingProvider | undefined))
    ) {
      if (await this.shouldUseAtharForVehicle(branchId, nextTrackingProvider, nextImei)) {
        await this.createAtharRouteEventsForVehicle(branchId, String(vehicle.routeId), nextImei || '');
      }
    }

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

