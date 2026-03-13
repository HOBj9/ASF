/**
 * Route Zone Service
 * CRUD for route zones (مناطق) - branch-scoped, belongs to city
 */

import connectDB from '@/lib/mongodb';
import RouteZone, { IRouteZone } from '@/models/RouteZone';
import City from '@/models/City';
import Branch from '@/models/Branch';
import Route from '@/models/Route';

export interface CreateRouteZoneData {
  cityId: string;
  branchId: string;
  name: string;
  nameAr?: string | null;
  order?: number;
}

export interface UpdateRouteZoneData {
  cityId?: string;
  name?: string;
  nameAr?: string | null;
  order?: number;
}

export class RouteZoneService {
  async list(branchId: string, cityId?: string | null): Promise<any[]> {
    await connectDB();
    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw new Error('الفرع غير موجود');
    const filter: any = { branchId };
    if (cityId) filter.cityId = cityId;
    return RouteZone.find(filter).sort({ order: 1, name: 1 }).lean().exec();
  }

  async create(branchId: string, data: CreateRouteZoneData): Promise<any> {
    await connectDB();
    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw new Error('الفرع غير موجود');
    const city = await City.findById(data.cityId).lean();
    if (!city) throw new Error('المدينة غير موجودة');
    if (String(city.organizationId) !== String(branch.organizationId)) {
      throw new Error('المدينة لا تنتمي لمؤسسة الفرع');
    }
    return RouteZone.create({
      organizationId: branch.organizationId,
      branchId: data.branchId,
      cityId: data.cityId,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
    });
  }

  async update(id: string, branchId: string, data: UpdateRouteZoneData): Promise<any | null> {
    await connectDB();
    const zone = await RouteZone.findOne({ _id: id, branchId });
    if (!zone) return null;
    const updateData: any = {};
    if (data.cityId !== undefined) updateData.cityId = data.cityId;
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order;
    const updated = await RouteZone.findByIdAndUpdate(zone._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    return updated;
  }

  async delete(id: string, branchId: string): Promise<boolean> {
    await connectDB();
    const zone = await RouteZone.findOne({ _id: id, branchId });
    if (!zone) return false;
    await Route.updateMany({ zoneIds: id }, { $pull: { zoneIds: id } }).exec();
    const deleted = await RouteZone.findOneAndDelete({ _id: id, branchId }).exec();
    return !!deleted;
  }

  async getById(id: string, branchId: string): Promise<any | null> {
    await connectDB();
    return RouteZone.findOne({ _id: id, branchId }).lean().exec();
  }
}
