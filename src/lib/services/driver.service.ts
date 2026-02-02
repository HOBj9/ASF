/**
 * Driver Service
 * Business logic for driver management
 */

import connectDB from '@/lib/mongodb';
import Driver, { IDriver } from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import Branch from '@/models/Branch';

export interface CreateDriverData {
  branchId: string;
  name: string;
  phone?: string;
  nationalId?: string;
  assignedVehicleId?: string;
  isActive?: boolean;
}

export interface UpdateDriverData {
  name?: string;
  phone?: string;
  nationalId?: string;
  assignedVehicleId?: string | null;
  isActive?: boolean;
}

export class DriverService {
  async create(data: CreateDriverData): Promise<IDriver> {
    await connectDB();

    const branch = await Branch.findById(data.branchId).lean();
    if (!branch) {
      throw new Error('الفرع غير موجود');
    }

    const driver = await Driver.create({
      branchId: data.branchId,
      name: data.name,
      phone: data.phone || null,
      nationalId: data.nationalId || null,
      assignedVehicleId: data.assignedVehicleId || null,
      isActive: data.isActive ?? true,
    });

    if (data.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(data.assignedVehicleId, {
        driverId: driver._id,
      }).exec();
    }

    return driver;
  }

  async getAll(branchId: string): Promise<IDriver[]> {
    await connectDB();
    return Driver.find({ branchId }).lean().exec();
  }

  async getById(id: string, branchId: string): Promise<IDriver | null> {
    await connectDB();
    return Driver.findOne({ _id: id, branchId }).lean().exec();
  }

  async update(id: string, branchId: string, data: UpdateDriverData): Promise<IDriver | null> {
    await connectDB();

    const driver = await Driver.findOne({ _id: id, branchId });
    if (!driver) {
      throw new Error('السائق غير موجود');
    }

    const prevVehicleId = driver.assignedVehicleId?.toString();
    const nextVehicleId =
      data.assignedVehicleId === undefined ? prevVehicleId : data.assignedVehicleId || null;

    if (data.assignedVehicleId !== undefined && prevVehicleId && prevVehicleId !== nextVehicleId) {
      await Vehicle.findByIdAndUpdate(prevVehicleId, { driverId: null }).exec();
    }

    if (data.assignedVehicleId && data.assignedVehicleId !== prevVehicleId) {
      await Vehicle.findByIdAndUpdate(data.assignedVehicleId, { driverId: driver._id }).exec();
    }

    const updateData: any = { ...data };
    if (data.phone !== undefined && data.phone === '') updateData.phone = null;
    if (data.nationalId !== undefined && data.nationalId === '') updateData.nationalId = null;

    const updated = await Driver.findByIdAndUpdate(driver._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    const driver = await Driver.findOne({ _id: id, branchId }).lean();
    if (!driver) return false;

    if (driver.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(driver.assignedVehicleId, { driverId: null }).exec();
    }

    const deleted = await Driver.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}

