/**
 * Point Service
 * Business logic for point management
 */

import connectDB from '@/lib/mongodb';
import Point, { IPoint, PointType } from '@/models/Point';
import Municipality from '@/models/Municipality';

export interface CreatePointData {
  municipalityId: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  type?: PointType;
  lat: number;
  lng: number;
  radiusMeters?: number;
  zoneId?: string;
  addressText?: string;
  isActive?: boolean;
}

export interface UpdatePointData {
  name?: string;
  nameAr?: string;
  nameEn?: string;
  type?: PointType;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  addressText?: string;
  isActive?: boolean;
}

export class PointService {
  async create(data: CreatePointData): Promise<IPoint> {
    await connectDB();

    const municipality = await Municipality.findById(data.municipalityId).lean();
    if (!municipality) {
      throw new Error('البلدية غير موجودة');
    }

    const existing = await Point.findOne({
      municipalityId: data.municipalityId,
      name: data.name.trim(),
    }).lean();
    if (existing) {
      throw new Error('الحاوية موجودة مسبقًا');
    }

    const point = await Point.create({
      municipalityId: data.municipalityId,
      name: data.name.trim(),
      nameAr: data.nameAr || null,
      nameEn: data.nameEn || null,
      type: data.type || 'container',
      lat: data.lat,
      lng: data.lng,
      radiusMeters: data.radiusMeters ?? 500,
      zoneId: data.zoneId || null,
      addressText: data.addressText || null,
      isActive: data.isActive ?? true,
    });

    return point;
  }

  async getAll(municipalityId: string): Promise<IPoint[]> {
    await connectDB();
    return Point.find({ municipalityId }).lean().exec();
  }

  async getById(id: string, municipalityId: string): Promise<IPoint | null> {
    await connectDB();
    return Point.findOne({ _id: id, municipalityId }).lean().exec();
  }

  async update(id: string, municipalityId: string, data: UpdatePointData): Promise<IPoint | null> {
    await connectDB();

    const point = await Point.findOne({ _id: id, municipalityId });
    if (!point) {
      throw new Error('الحاوية غير موجودة');
    }

    const updateData: any = { ...data };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined && data.nameAr === '') updateData.nameAr = null;
    if (data.nameEn !== undefined && data.nameEn === '') updateData.nameEn = null;
    if (data.addressText !== undefined && data.addressText === '') updateData.addressText = null;

    const updated = await Point.findByIdAndUpdate(point._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, municipalityId: string): Promise<boolean> {
    await connectDB();
    const deleted = await Point.findOneAndDelete({ _id: id, municipalityId }).exec();
    return !!deleted;
  }
}
