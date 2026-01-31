/**
 * Driver Service
 * Business logic for driver management
 */

import connectDB from '@/lib/mongodb';
import Driver, { IDriver } from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import Municipality from '@/models/Municipality';

export interface CreateDriverData {
  municipalityId: string;
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

    const municipality = await Municipality.findById(data.municipalityId).lean();
    if (!municipality) {
      throw new Error('البلدية غير موجودة');
    }

    const driver = await Driver.create({
      municipalityId: data.municipalityId,
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

  async getAll(municipalityId: string): Promise<IDriver[]> {
    await connectDB();
    return Driver.find({ municipalityId }).lean().exec();
  }

  async getById(id: string, municipalityId: string): Promise<IDriver | null> {
    await connectDB();
    return Driver.findOne({ _id: id, municipalityId }).lean().exec();
  }

  async update(id: string, municipalityId: string, data: UpdateDriverData): Promise<IDriver | null> {
    await connectDB();

    const driver = await Driver.findOne({ _id: id, municipalityId });
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

  async delete(id: string, municipalityId: string): Promise<boolean> {
    await connectDB();
    const driver = await Driver.findOne({ _id: id, municipalityId }).lean();
    if (!driver) return false;

    if (driver.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(driver.assignedVehicleId, { driverId: null }).exec();
    }

    const deleted = await Driver.findByIdAndDelete(id).exec();
    return !!deleted;
  }
}
