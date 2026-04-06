/**
 * City Service
 * CRUD for cities (مدن) - organization-scoped, belongs to governorate
 */

import connectDB from '@/lib/mongodb';
import City, { ICity } from '@/models/City';
import Governorate from '@/models/Governorate';
import RouteZone from '@/models/RouteZone';
import Organization from '@/models/Organization';

export interface CreateCityData {
  governorateId: string;
  name: string;
  nameAr?: string | null;
  order?: number;
}

export interface UpdateCityData {
  governorateId?: string;
  name?: string;
  nameAr?: string | null;
  order?: number;
}

export class CityService {
  async list(organizationId: string, governorateId?: string | null): Promise<any[]> {
    await connectDB();
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    const filter: any = { organizationId };
    if (governorateId) filter.governorateId = governorateId;
    return City.find(filter).sort({ order: 1, name: 1 }).lean().exec();
  }

  async create(organizationId: string, data: CreateCityData): Promise<any> {
    await connectDB();
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    const gov = await Governorate.findOne({ _id: data.governorateId, organizationId }).lean();
    if (!gov) throw new Error('المحافظة غير موجودة');
    return City.create({
      organizationId,
      governorateId: data.governorateId,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
    });
  }

  async update(id: string, organizationId: string, data: UpdateCityData): Promise<any | null> {
    await connectDB();
    const city = await City.findOne({ _id: id, organizationId });
    if (!city) return null;
    const updateData: any = {};
    if (data.governorateId !== undefined) {
      const gov = await Governorate.findOne({ _id: data.governorateId, organizationId }).lean();
      if (!gov) throw new Error('المحافظة غير موجودة');
      updateData.governorateId = data.governorateId;
    }
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order;
    const updated = await City.findByIdAndUpdate(city._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    return updated;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    await connectDB();
    const city = await City.findOne({ _id: id, organizationId });
    if (!city) return false;
    const zoneCount = await RouteZone.countDocuments({ cityId: id });
    if (zoneCount > 0) {
      throw new Error('لا يمكن حذف المدينة لوجود مناطق مرتبطة بها');
    }
    const deleted = await City.findOneAndDelete({ _id: id, organizationId }).exec();
    return !!deleted;
  }

  async getById(id: string, organizationId: string): Promise<any | null> {
    await connectDB();
    return City.findOne({ _id: id, organizationId }).lean().exec();
  }
}
