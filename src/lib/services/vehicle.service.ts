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
import { AtharService } from '@/lib/services/athar.service';

export interface CreateVehicleData {
  branchId: string;
  name: string;
  plateNumber?: string;
  imei: string;
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

  private async createAtharRouteEventsForVehicle(
    branchId: string,
    routeId: string,
    imei: string
  ): Promise<void> {
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

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId: data.branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
      }

      await this.createAtharRouteEventsForVehicle(data.branchId, data.routeId, data.imei);
    }

    const vehicle = await Vehicle.create({
      branchId: data.branchId,
      name: data.name,
      plateNumber: data.plateNumber || null,
      imei: data.imei,
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

      await Vehicle.create({
        branchId,
        name: obj.name || `مركبة أثر ${obj.id}`,
        plateNumber: obj.plateNumber ?? null,
        imei: obj.imei,
        fuelType: 'gasoline',
        atharObjectId: obj.id,
        driverId: null,
        routeId: null,
        isActive: true,
      });
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

    const updateData: any = { ...data };
    delete updateData.branchId;
    if (data.plateNumber !== undefined && data.plateNumber === '') updateData.plateNumber = null;
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
      const nextImei = data.imei || vehicle.imei;
      if (prevRouteId !== nextRouteId) {
        await this.createAtharRouteEventsForVehicle(branchId, nextRouteId, nextImei);
      }
    }

    if (data.routeId === undefined && data.imei && vehicle.routeId && data.imei !== vehicle.imei) {
      await this.createAtharRouteEventsForVehicle(branchId, String(vehicle.routeId), data.imei);
    }

    const updated = await Vehicle.findByIdAndUpdate(vehicle._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    const vehicle = await Vehicle.findOne({ _id: id, branchId }).lean();
    if (!vehicle) return false;

    if (vehicle.driverId) {
      await Driver.findByIdAndUpdate(vehicle.driverId, { assignedVehicleId: null }).exec();
    }

    const deleted = await Vehicle.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}

