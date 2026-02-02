/**
 * Vehicle Service
 * Business logic for vehicle management
 */

import connectDB from '@/lib/mongodb';
import Vehicle, { IVehicle } from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Branch from '@/models/Branch';
import Route from '@/models/Route';

export interface CreateVehicleData {
  branchId: string;
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

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
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

  async getAll(branchId: string): Promise<IVehicle[]> {
    await connectDB();
    return Vehicle.find({ branchId }).lean().exec();
  }

  async getById(id: string, branchId: string): Promise<IVehicle | null> {
    await connectDB();
    return Vehicle.findOne({ _id: id, branchId }).lean().exec();
  }

  async update(id: string, branchId: string, data: UpdateVehicleData): Promise<IVehicle | null> {
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
    if (data.plateNumber !== undefined && data.plateNumber === '') updateData.plateNumber = null;
    if (data.atharObjectId !== undefined && data.atharObjectId === '') updateData.atharObjectId = null;
    if (data.routeId !== undefined && data.routeId === '') updateData.routeId = null;

    if (data.routeId) {
      const route = await Route.findOne({ _id: data.routeId, branchId }).lean();
      if (!route) {
        throw new Error('المسار غير موجود أو غير تابع للفرع');
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

