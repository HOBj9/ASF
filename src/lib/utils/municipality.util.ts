import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';

export function resolveBranchId(
  session: any,
  providedBranchId?: string | null
): string {
  const sessionBranchId = session?.user?.branchId || null;
  const role = session?.user?.role || null;

  if (isAdmin(role) || isOrganizationAdmin(role)) {
    const resolved = providedBranchId || sessionBranchId;
    if (!resolved) {
      throw new Error('يرجى تحديد الفرع');
    }
    return resolved;
  }

  if (!sessionBranchId) {
    throw new Error('لا يوجد فرع مرتبط بالحساب');
  }

  return sessionBranchId;
}

/**
 * For report APIs only: resolve to either a branchId or organizationId.
 * When organization admin does not provide branchId, returns { branchId: null, organizationId }.
 */
export function resolveReportScope(
  session: any,
  providedBranchId?: string | null
): { branchId: string | null; organizationId: string | null } {
  const role = session?.user?.role || null;
  const sessionBranchId = session?.user?.branchId || null;
  const sessionOrgId = session?.user?.organizationId || null;

  if (isAdmin(role)) {
    const bid = providedBranchId || sessionBranchId;
    if (!bid) throw new Error('يرجى تحديد الفرع');
    return { branchId: bid, organizationId: null };
  }

  if (isOrganizationAdmin(role)) {
    if (providedBranchId) {
      return { branchId: providedBranchId, organizationId: null };
    }
    if (sessionOrgId) {
      return { branchId: null, organizationId: String(sessionOrgId) };
    }
    throw new Error('لا توجد مؤسسة مرتبطة بالحساب');
  }

  if (!sessionBranchId) {
    throw new Error('لا يوجد فرع مرتبط بالحساب');
  }
  return { branchId: sessionBranchId, organizationId: null };
}
