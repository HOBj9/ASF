/**
 * Municipality Service
 * Business logic for municipality management
 */

import connectDB from '@/lib/mongodb';
import Municipality, { IMunicipality } from '@/models/Municipality';

export interface CreateMunicipalityData {
  name: string;
  nameAr?: string;
  governorate: string;
  areaName?: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone?: string;
  atharKey?: string;
  isActive?: boolean;
}

export interface UpdateMunicipalityData {
  name?: string;
  nameAr?: string;
  governorate?: string;
  areaName?: string;
  addressText?: string;
  centerLat?: number;
  centerLng?: number;
  timezone?: string;
  atharKey?: string;
  isActive?: boolean;
}

export class MunicipalityService {
  async create(data: CreateMunicipalityData): Promise<IMunicipality> {
    await connectDB();
    const municipality = await Municipality.create({
      name: data.name,
      nameAr: data.nameAr || null,
      governorate: data.governorate,
      areaName: data.areaName || null,
      addressText: data.addressText || null,
      centerLat: data.centerLat,
      centerLng: data.centerLng,
      timezone: data.timezone || 'Asia/Damascus',
      atharKey: data.atharKey || null,
      isActive: data.isActive ?? true,
    });

    return municipality;
  }

  async getAll(): Promise<IMunicipality[]> {
    await connectDB();
    return Municipality.find({}).lean().exec();
  }

  async getById(id: string): Promise<IMunicipality | null> {
    await connectDB();
    return Municipality.findById(id).lean().exec();
  }

  async update(id: string, data: UpdateMunicipalityData): Promise<IMunicipality | null> {
    await connectDB();
    const updateData: any = { ...data };
    if (data.nameAr !== undefined && data.nameAr === '') updateData.nameAr = null;
    if (data.areaName !== undefined && data.areaName === '') updateData.areaName = null;
    if (data.addressText !== undefined && data.addressText === '') updateData.addressText = null;
    if (data.atharKey !== undefined && data.atharKey === '') updateData.atharKey = null;

    return Municipality.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const doc = await Municipality.findByIdAndDelete(id);
    return !!doc;
  }
}
