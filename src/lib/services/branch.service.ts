/**
 * Branch Service
 * Business logic for branch management
 */

import connectDB from '@/lib/mongodb';
import Branch, { IBranch } from '@/models/Branch';

export interface CreateBranchData {
  organizationId: string;
  name: string;
  nameAr?: string;
  branchTypeLabel?: string;
  governorate?: string;
  areaName?: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone?: string;
  atharKey?: string;
  fuelPricePerKmGasoline?: number;
  fuelPricePerKmDiesel?: number;
  isActive?: boolean;
}

export interface UpdateBranchData {
  name?: string;
  nameAr?: string;
  branchTypeLabel?: string;
  governorate?: string;
  areaName?: string;
  addressText?: string;
  centerLat?: number;
  centerLng?: number;
  timezone?: string;
  atharKey?: string;
  fuelPricePerKmGasoline?: number;
  fuelPricePerKmDiesel?: number;
  isActive?: boolean;
}

export class BranchService {
  async create(data: CreateBranchData): Promise<IBranch> {
    await connectDB();
    const branch = await Branch.create({
      organizationId: data.organizationId,
      name: data.name,
      nameAr: data.nameAr || null,
      branchTypeLabel: data.branchTypeLabel || null,
      governorate: data.governorate || null,
      areaName: data.areaName || null,
      addressText: data.addressText || null,
      centerLat: data.centerLat,
      centerLng: data.centerLng,
      timezone: data.timezone || 'Asia/Damascus',
      atharKey: data.atharKey || null,
      fuelPricePerKmGasoline: data.fuelPricePerKmGasoline ?? null,
      fuelPricePerKmDiesel: data.fuelPricePerKmDiesel ?? null,
      isActive: data.isActive ?? true,
    });

    return branch;
  }

  async getAll(organizationId?: string): Promise<IBranch[]> {
    await connectDB();
    const query = organizationId ? { organizationId } : {};
    return Branch.find(query).lean().exec();
  }

  async getById(id: string): Promise<IBranch | null> {
    await connectDB();
    return Branch.findById(id).lean().exec();
  }

  async update(id: string, data: UpdateBranchData): Promise<IBranch | null> {
    await connectDB();
    const updateData: any = { ...data };
    if (data.nameAr !== undefined && data.nameAr === '') updateData.nameAr = null;
    if (data.branchTypeLabel !== undefined && data.branchTypeLabel === '') updateData.branchTypeLabel = null;
    if (data.areaName !== undefined && data.areaName === '') updateData.areaName = null;
    if (data.addressText !== undefined && data.addressText === '') updateData.addressText = null;
    if (data.atharKey !== undefined && data.atharKey === '') updateData.atharKey = null;
    if (data.fuelPricePerKmGasoline !== undefined && (data.fuelPricePerKmGasoline === '' || data.fuelPricePerKmGasoline == null)) updateData.fuelPricePerKmGasoline = null;
    if (data.fuelPricePerKmDiesel !== undefined && (data.fuelPricePerKmDiesel === '' || data.fuelPricePerKmDiesel == null)) updateData.fuelPricePerKmDiesel = null;

    return Branch.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const doc = await Branch.findByIdAndDelete(id);
    return !!doc;
  }
}
