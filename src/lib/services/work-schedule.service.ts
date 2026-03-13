/**
 * Work Schedule Service
 * Manages work schedules (أيام العمل) - org-level with branch inheritance and overrides
 */

import connectDB from '@/lib/mongodb';
import WorkSchedule, { IWorkSchedule, IWorkScheduleDay } from '@/models/WorkSchedule';
import Branch from '@/models/Branch';
import Organization from '@/models/Organization';
import Route from '@/models/Route';

export interface CreateWorkScheduleData {
  organizationId: string;
  branchId?: string | null;
  sourceWorkScheduleId?: string | null;
  name: string;
  nameAr?: string | null;
  order?: number;
  days: IWorkScheduleDay[];
}

export interface UpdateWorkScheduleData {
  name?: string;
  nameAr?: string | null;
  order?: number;
  days?: IWorkScheduleDay[];
}

export interface WorkScheduleForBranch {
  _id: string;
  organizationId: string;
  branchId: string | null;
  sourceWorkScheduleId: string | null;
  name: string;
  nameAr: string | null;
  order: number;
  days: IWorkScheduleDay[];
  source: 'org' | 'branch_own' | 'branch_override';
}

export class WorkScheduleService {
  async getAllForOrganization(organizationId: string): Promise<any[]> {
    await connectDB();
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');
    return WorkSchedule.find({
      organizationId,
      branchId: null,
    })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();
  }

  /**
   * Get all schedules available for a branch:
   * - Org schedules (inherited), unless branch has override
   * - Branch overrides (replace their source org schedule)
   * - Branch's own schedules (branchId set, sourceWorkScheduleId null)
   */
  async getAllForBranch(branchId: string): Promise<WorkScheduleForBranch[]> {
    await connectDB();
    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw new Error('الفرع غير موجود');
    const orgId = String(branch.organizationId);

    const orgSchedules = await WorkSchedule.find({
      organizationId: orgId,
      branchId: null,
    })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    const branchSchedules = await WorkSchedule.find({
      branchId,
    })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    const overrideSourceIds = new Set(
      branchSchedules
        .filter((s: any) => s.sourceWorkScheduleId)
        .map((s: any) => String(s.sourceWorkScheduleId))
    );

    const result: WorkScheduleForBranch[] = [];

    for (const s of orgSchedules) {
      const sId = String((s as any)._id);
      if (overrideSourceIds.has(sId)) continue;
      result.push({
        ...(s as any),
        _id: sId,
        source: 'org',
      });
    }

    for (const s of branchSchedules) {
      const sId = String((s as any)._id);
      result.push({
        ...(s as any),
        _id: sId,
        source: (s as any).sourceWorkScheduleId ? 'branch_override' : 'branch_own',
      });
    }

    result.sort((a, b) => a.order - b.order || (a.name || '').localeCompare(b.name || ''));
    return result;
  }

  async create(data: CreateWorkScheduleData): Promise<any> {
    await connectDB();

    const org = await Organization.findById(data.organizationId).lean();
    if (!org) throw new Error('المؤسسة غير موجودة');

    if (data.branchId) {
      const branch = await Branch.findById(data.branchId).lean();
      if (!branch) throw new Error('الفرع غير موجود');
      if (String(branch.organizationId) !== String(data.organizationId)) {
        throw new Error('الفرع لا ينتمي للمؤسسة');
      }
      if (data.sourceWorkScheduleId) {
        const source = await WorkSchedule.findOne({
          _id: data.sourceWorkScheduleId,
          organizationId: data.organizationId,
          branchId: null,
        }).lean();
        if (!source) throw new Error('جدول العمل المصدر غير موجود');
      }
    } else {
      if (data.sourceWorkScheduleId) {
        throw new Error('لا يمكن نسخ جدول على مستوى المؤسسة');
      }
    }

    return WorkSchedule.create({
      organizationId: data.organizationId,
      branchId: data.branchId || null,
      sourceWorkScheduleId: data.sourceWorkScheduleId || null,
      name: data.name.trim(),
      nameAr: data.nameAr?.trim() || null,
      order: data.order ?? 0,
      days: Array.isArray(data.days) ? data.days : [],
    });
  }

  async createBranchCopy(branchId: string, sourceId: string): Promise<any> {
    await connectDB();
    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw new Error('الفرع غير موجود');

    const source = await WorkSchedule.findOne({
      _id: sourceId,
      organizationId: branch.organizationId,
      branchId: null,
    }).lean();
    if (!source) throw new Error('جدول العمل المصدر غير موجود');

    const existingOverride = await WorkSchedule.findOne({
      branchId,
      sourceWorkScheduleId: sourceId,
    }).lean();
    if (existingOverride) {
      throw new Error('يوجد بالفعل نسخة من هذا الجدول للفرع');
    }

    return WorkSchedule.create({
      organizationId: branch.organizationId,
      branchId,
      sourceWorkScheduleId: sourceId,
      name: (source as any).name,
      nameAr: (source as any).nameAr || null,
      order: (source as any).order ?? 0,
      days: (source as any).days || [],
    });
  }

  async update(
    id: string,
    context: { organizationId?: string; branchId?: string },
    data: UpdateWorkScheduleData
  ): Promise<any | null> {
    await connectDB();

    const filter: any = { _id: id };
    if (context.organizationId) filter.organizationId = context.organizationId;
    if (context.branchId !== undefined) {
      if (context.branchId) {
        filter.branchId = context.branchId;
      } else {
        filter.branchId = null;
      }
    }

    const schedule = await WorkSchedule.findOne(filter);
    if (!schedule) return null;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr?.trim() || null;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.days !== undefined) updateData.days = Array.isArray(data.days) ? data.days : [];

    const updated = await WorkSchedule.findByIdAndUpdate(schedule._id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    return updated;
  }

  async delete(
    id: string,
    context: { organizationId?: string; branchId?: string }
  ): Promise<boolean> {
    await connectDB();

    const filter: any = { _id: id };
    if (context.organizationId) filter.organizationId = context.organizationId;
    if (context.branchId !== undefined) {
      if (context.branchId) {
        filter.branchId = context.branchId;
      } else {
        filter.branchId = null;
      }
    }

    const schedule = await WorkSchedule.findOne(filter);
    if (!schedule) return false;

    await Route.updateMany({ workScheduleId: id }, { $unset: { workScheduleId: 1 } }).exec();
    const deleted = await WorkSchedule.findOneAndDelete(filter).exec();
    return !!deleted;
  }

  async getById(
    id: string,
    context: { organizationId?: string; branchId?: string }
  ): Promise<any | null> {
    await connectDB();

    const filter: any = { _id: id };
    if (context.organizationId) filter.organizationId = context.organizationId;
    if (context.branchId !== undefined) {
      if (context.branchId) {
        filter.branchId = context.branchId;
      } else {
        filter.branchId = null;
      }
    }

    return WorkSchedule.findOne(filter).lean().exec();
  }

  /**
   * Check if a work schedule is available for a branch (for route linking)
   */
  async isAvailableForBranch(scheduleId: string, branchId: string): Promise<boolean> {
    await connectDB();
    const branch = await Branch.findById(branchId).lean();
    if (!branch) return false;

    const schedule = await WorkSchedule.findById(scheduleId).lean();
    if (!schedule) return false;

    const s = schedule as any;
    if (String(s.organizationId) !== String(branch.organizationId)) return false;

    if (!s.branchId) return true;
    return String(s.branchId) === String(branchId);
  }
}
