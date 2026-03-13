/**
 * Governorate Service
 * CRUD for governorates (محافظات) - organization-scoped
 */

import connectDB from '@/lib/mongodb';
import Governorate, { IGovernorate } from '@/models/Governorate';
import City from '@/models/City';
import Organization from '@/models/Organization';

export interface CreateGovernorateData {
  name: string;
  nameAr?: string | null;
  order?: number;
}

export interface UpdateGovernorateData {
  name?: string;
  nameAr?: string | null;
  order?: number;
}

export class GovernorateService {
  async list(organizationId: string): Promise<any[]> {
    await connectDB();
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    return Governorate.find({ organizationId }).sort({ order: 1, name: 1 }).lean().exec();
  }

  async create(organizationId: string, data: CreateGovernorateData): Promise<any> {
    await connectDB();
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    return Governorate.create({
      organizationId,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
    });
  }

  async update(id: string, organizationId: string, data: UpdateGovernorateData): Promise<any | null> {
    await connectDB();
    const gov = await Governorate.findOne({ _id: id, organizationId });
    if (!gov) return null;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order;
    const updated = await Governorate.findByIdAndUpdate(gov._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    return updated;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    await connectDB();
    const gov = await Governorate.findOne({ _id: id, organizationId });
    if (!gov) return false;
    const cityCount = await City.countDocuments({ governorateId: id });
    if (cityCount > 0) {
      throw new Error('لا يمكن حذف المحافظة لوجود مدن مرتبطة بها');
    }
    const deleted = await Governorate.findOneAndDelete({ _id: id, organizationId }).exec();
    return !!deleted;
  }

  async getById(id: string, organizationId: string): Promise<any | null> {
    await connectDB();
    return Governorate.findOne({ _id: id, organizationId }).lean().exec();
  }
}
