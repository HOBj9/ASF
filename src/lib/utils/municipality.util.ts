import { isAdmin } from '@/lib/permissions';

export function resolveBranchId(
  session: any,
  providedBranchId?: string | null
): string {
  const sessionBranchId = session?.user?.branchId || null;
  const role = session?.user?.role || null;

  if (isAdmin(role)) {
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

