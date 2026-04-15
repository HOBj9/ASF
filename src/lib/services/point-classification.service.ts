/**
 * Point Classification Service
 * Manages primary and secondary classifications for points.
 * Org admin: full CRUD on org-level. Branch admin: add-only.
 */

import connectDB from '@/lib/mongodb';
import PointPrimaryClassification from '@/models/PointPrimaryClassification';
import PointSecondaryClassification from '@/models/PointSecondaryClassification';
import Branch from '@/models/Branch';
import Organization from '@/models/Organization';

export interface CreatePrimaryData {
  name: string;
  nameAr?: string | null;
  order?: number;
}

export interface CreateSecondaryData {
  name: string;
  nameAr?: string | null;
  order?: number;
}

export interface UpdatePrimaryData {
  name?: string;
  nameAr?: string | null;
  order?: number;
}

export interface UpdateSecondaryData {
  name?: string;
  nameAr?: string | null;
  order?: number;
}

export class PointClassificationService {
  private async ensureOrganizationExists(organizationId: string) {
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    return org;
  }

  private async resolveBranchScope(branchId: string) {
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (!branch) throw new Error('الفرع غير موجود');

    return {
      branch,
      organizationId: String(branch.organizationId),
    };
  }

  async listPrimariesForOrganization(organizationId: string): Promise<any[]> {
    await connectDB();
    await this.ensureOrganizationExists(organizationId);

    return PointPrimaryClassification.find({
      organizationId,
      branchId: null,
    })
      .sort({ order: 1, name: 1 })
      .lean();
  }

  async listSecondariesForOrganization(
    organizationId: string,
    primaryClassificationId?: string | null
  ): Promise<any[]> {
    await connectDB();
    await this.ensureOrganizationExists(organizationId);

    const normalizedPrimaryId = String(primaryClassificationId || '').trim();
    const query: Record<string, unknown> = {
      organizationId,
      branchId: null,
    };

    if (normalizedPrimaryId) {
      query.primaryClassificationId = normalizedPrimaryId;
    }

    return PointSecondaryClassification.find(query)
      .sort({ order: 1, name: 1 })
      .lean();
  }

  async listPrimariesForBranch(branchId: string): Promise<any[]> {
    await connectDB();

    const { organizationId } = await this.resolveBranchScope(branchId);
    return PointPrimaryClassification.find({
      organizationId,
      $or: [{ branchId: null }, { branchId }],
    })
      .sort({ order: 1, name: 1 })
      .lean();
  }

  async listSecondariesForBranch(
    branchId: string,
    primaryClassificationId?: string | null
  ): Promise<any[]> {
    await connectDB();

    const { organizationId } = await this.resolveBranchScope(branchId);
    const normalizedPrimaryId = String(primaryClassificationId || '').trim();
    const query: Record<string, unknown> = {
      organizationId,
      $or: [{ branchId: null }, { branchId }],
    };

    if (normalizedPrimaryId) {
      query.primaryClassificationId = normalizedPrimaryId;
    }

    return PointSecondaryClassification.find(query)
      .sort({ order: 1, name: 1 })
      .lean();
  }

  /** List org-level classifications only (for org admin management) */
  async listForOrganization(organizationId: string): Promise<{
    primaries: any[];
    secondaries: any[];
  }> {
    const [primaries, secondaries] = await Promise.all([
      this.listPrimariesForOrganization(organizationId),
      this.listSecondariesForOrganization(organizationId),
    ]);

    return { primaries, secondaries };
  }

  /** List org + branch classifications (for branch context, e.g. when adding a point) */
  async listForBranch(branchId: string): Promise<{
    primaries: any[];
    secondaries: any[];
  }> {
    const [primaries, secondaries] = await Promise.all([
      this.listPrimariesForBranch(branchId),
      this.listSecondariesForBranch(branchId),
    ]);

    return { primaries, secondaries };
  }

  /** Create primary classification (org or branch) */
  async createPrimary(
    organizationId: string,
    data: CreatePrimaryData,
    branchId?: string | null
  ): Promise<any> {
    await connectDB();
    await this.ensureOrganizationExists(organizationId);

    if (branchId) {
      const branch = await Branch.findById(branchId).lean();
      if (!branch) throw new Error('الفرع غير موجود');
      if (String(branch.organizationId) !== String(organizationId)) {
        throw new Error('الفرع لا ينتمي للمؤسسة');
      }
    }

    const created = await PointPrimaryClassification.create({
      organizationId,
      branchId: branchId || null,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
    });

    return created.toObject ? created.toObject() : created;
  }

  /** Create secondary classification (org or branch) */
  async createSecondary(
    organizationId: string,
    primaryClassificationId: string,
    data: CreateSecondaryData,
    branchId?: string | null
  ): Promise<any> {
    await connectDB();

    const primary = await PointPrimaryClassification.findById(primaryClassificationId).lean();
    if (!primary) throw new Error('التصنيف الأساسي غير موجود');
    if (String(primary.organizationId) !== String(organizationId)) {
      throw new Error('التصنيف الأساسي لا ينتمي للمؤسسة');
    }

    if (branchId) {
      const branch = await Branch.findById(branchId).lean();
      if (!branch) throw new Error('الفرع غير موجود');
      if (String(branch.organizationId) !== String(organizationId)) {
        throw new Error('الفرع لا ينتمي للمؤسسة');
      }
    }

    const created = await PointSecondaryClassification.create({
      organizationId,
      branchId: branchId || null,
      primaryClassificationId,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
    });

    return created.toObject ? created.toObject() : created;
  }

  /** Update primary - only org-level (branchId null). Org admin only. */
  async updatePrimary(
    id: string,
    organizationId: string,
    data: UpdatePrimaryData
  ): Promise<any> {
    await connectDB();

    const existing = await PointPrimaryClassification.findOne({
      _id: id,
      organizationId,
      branchId: null,
    });
    if (!existing) throw new Error('التصنيف الأساسي غير موجود أو لا يمكن تعديله');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order ?? 0;

    const updated = await PointPrimaryClassification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return updated;
  }

  /** Delete primary - only org-level. Org admin only. */
  async deletePrimary(id: string, organizationId: string): Promise<boolean> {
    await connectDB();

    const existing = await PointPrimaryClassification.findOne({
      _id: id,
      organizationId,
      branchId: null,
    });
    if (!existing) throw new Error('التصنيف الأساسي غير موجود أو لا يمكن حذفه');

    await PointSecondaryClassification.deleteMany({ primaryClassificationId: id });
    await PointPrimaryClassification.findByIdAndDelete(id);
    return true;
  }

  /** Update secondary - only org-level. Org admin only. */
  async updateSecondary(
    id: string,
    organizationId: string,
    data: UpdateSecondaryData
  ): Promise<any> {
    await connectDB();

    const existing = await PointSecondaryClassification.findOne({
      _id: id,
      organizationId,
      branchId: null,
    });
    if (!existing) throw new Error('التصنيف الفرعي غير موجود أو لا يمكن تعديله');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order ?? 0;

    const updated = await PointSecondaryClassification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return updated;
  }

  /** Delete secondary - only org-level. Org admin only. */
  async deleteSecondary(id: string, organizationId: string): Promise<boolean> {
    await connectDB();

    const existing = await PointSecondaryClassification.findOne({
      _id: id,
      organizationId,
      branchId: null,
    });
    if (!existing) throw new Error('التصنيف الفرعي غير موجود أو لا يمكن حذفه');

    await PointSecondaryClassification.findByIdAndDelete(id);
    return true;
  }
}
