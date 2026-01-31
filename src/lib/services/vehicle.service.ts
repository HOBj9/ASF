/**
 * Vehicle Service
 * Business logic for vehicle management
 */

import connectDB from '@/lib/mongodb';
import Vehicle, { IVehicle } from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Municipality from '@/models/Municipality';
import Route from '@/models/Route';

export interface CreateVehicleData {
  municipalityId: string;
  name: string;
  plateNumber?: string;
  imei: string;
  atharObjectId?: string;
  driverId?: string;
  routeId?: string;
  isActive?: boolean;
}

export interface UpdateVehicleData {
  name?: string;
  plateNumber?: string;
  imei?: string;
  atharObjectId?: string;
  driverId?: string | null;
  routeId?: string | null;
  isActive?: boolean;
}

export class VehicleService {
  async create(data: CreateVehicleData): Promise<IVehicle> {
    await connectDB();

    const municipality = await Municipality.findById(data.municipalityId).lean();
    if (!municipality) {
      throw new Error('البلدية غير موجودة');
    }

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, municipalityId: data.municipalityId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للبلدية');
      }
    }

    const vehicle = await Vehicle.create({
      municipalityId: data.municipalityId,
      name: data.name,
      plateNumber: data.plateNumber || null,
      imei: data.imei,
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

  async getAll(municipalityId: string): Promise<IVehicle[]> {
    await connectDB();
    return Vehicle.find({ municipalityId }).lean().exec();
  }

  async getById(id: string, municipalityId: string): Promise<IVehicle | null> {
    await connectDB();
    return Vehicle.findOne({ _id: id, municipalityId }).lean().exec();
  }

  async update(id: string, municipalityId: string, data: UpdateVehicleData): Promise<IVehicle | null> {
    await connectDB();

    const vehicle = await Vehicle.findOne({ _id: id, municipalityId });
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
    if (data.plateNumber !== undefined && data.plateNumber === '') updateData.plateNumber = null;
    if (data.atharObjectId !== undefined && data.atharObjectId === '') updateData.atharObjectId = null;
    if (data.routeId !== undefined && data.routeId === '') updateData.routeId = null;

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, municipalityId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للبلدية');
      }
    }

    const updated = await Vehicle.findByIdAndUpdate(vehicle._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, municipalityId: string): Promise<boolean> {
    await connectDB();
    const vehicle = await Vehicle.findOne({ _id: id, municipalityId }).lean();
    if (!vehicle) return false;

    if (vehicle.driverId) {
      await Driver.findByIdAndUpdate(vehicle.driverId, { assignedVehicleId: null }).exec();
    }

    const deleted = await Vehicle.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}
