import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import type { EventReportScope } from '@/lib/types/event-reports';

type ResolveEventReportScopeInput = {
  organizationId?: string | null;
  branchId?: string | null;
};

function toId(value: unknown): string | null {
  if (!value) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

export async function resolveEventReportScope(
  session: any,
  input: ResolveEventReportScopeInput
): Promise<EventReportScope> {
  const role = session?.user?.role || null;
  const sessionOrganizationId = toId(session?.user?.organizationId);
  const sessionBranchId = toId(session?.user?.branchId);
  const providedOrganizationId = toId(input.organizationId);
  const providedBranchId = toId(input.branchId);

  await connectDB();

  if (isAdmin(role)) {
    if (!providedOrganizationId || !providedBranchId) {
      throw new Error('يرجى تحديد المؤسسة والفرع');
    }

    const branch = await Branch.findById(providedBranchId).select('organizationId').lean();
    if (!branch) throw new Error('الفرع غير موجود');

    const branchOrganizationId = toId(branch.organizationId);
    if (!branchOrganizationId || branchOrganizationId !== providedOrganizationId) {
      throw new Error('الفرع المحدد لا يتبع المؤسسة المحددة');
    }

    return {
      organizationId: providedOrganizationId,
      branchId: providedBranchId,
    };
  }

  if (isOrganizationAdmin(role)) {
    if (!sessionOrganizationId) {
      throw new Error('لا توجد مؤسسة مرتبطة بالحساب');
    }
    if (!providedBranchId) {
      throw new Error('يرجى تحديد الفرع');
    }

    const branch = await Branch.findById(providedBranchId).select('organizationId').lean();
    if (!branch) throw new Error('الفرع غير موجود');

    const branchOrganizationId = toId(branch.organizationId);
    if (!branchOrganizationId || branchOrganizationId !== sessionOrganizationId) {
      throw new Error('الفرع المحدد خارج نطاق المؤسسة');
    }

    return {
      organizationId: sessionOrganizationId,
      branchId: providedBranchId,
    };
  }

  if (!sessionBranchId) {
    throw new Error('لا يوجد فرع مرتبط بالحساب');
  }

  const branch = await Branch.findById(sessionBranchId).select('organizationId').lean();
  if (!branch) throw new Error('الفرع غير موجود');

  return {
    organizationId: toId(branch.organizationId),
    branchId: sessionBranchId,
  };
}

