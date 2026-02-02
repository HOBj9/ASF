import Branch from '@/models/Branch';
import connectDB from '@/lib/mongodb';
import { isAdmin } from '@/lib/permissions';

export async function resolveOrganizationId(
  session: any,
  providedOrganizationId?: string | null
): Promise<string> {
  const role = session?.user?.role || null;
  const sessionOrganizationId = session?.user?.organizationId || null;
  const sessionBranchId = session?.user?.branchId || null;

  if (isAdmin(role)) {
    const resolved = providedOrganizationId || sessionOrganizationId;
    if (!resolved) {
      throw new Error('يرجى تحديد المؤسسة');
    }
    return resolved;
  }

  if (sessionOrganizationId) {
    return sessionOrganizationId;
  }

  if (sessionBranchId) {
    await connectDB();
    const branch = await Branch.findById(sessionBranchId).select('organizationId').lean();
    if (branch?.organizationId) {
      return String(branch.organizationId);
    }
  }

  throw new Error('لا توجد مؤسسة مرتبطة بالحساب');
}

