import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { BranchService } from '@/lib/services/branch.service';
import { UserService } from '@/lib/services/user.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import Role from '@/models/Role';
import User from '@/models/User';

const branchService = new BranchService();
const userService = new UserService();

async function findBranchAdminUser(organizationId: string, branchId: string) {
  const branchAdminRole = await Role.findOne({ name: 'branch_admin' }).select('_id').lean();

  if (branchAdminRole?._id) {
    const branchAdmin = await User.findOne({
      organizationId,
      branchId,
      role: branchAdminRole._id,
    })
      .select('_id name email')
      .lean();

    if (branchAdmin) return branchAdmin;
  }

  return User.findOne({ organizationId, branchId })
    .select('_id name email')
    .lean();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);

    const branch = await branchService.getById(params.id);
    if (!branch || String(branch.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const branchAdminUser = await findBranchAdminUser(String(organizationId), params.id);

    return NextResponse.json({
      branch,
      branchAdminUser: branchAdminUser
        ? {
            _id: String(branchAdminUser._id),
            name: branchAdminUser.name,
            email: branchAdminUser.email,
          }
        : null,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);

    const existing = await branchService.getById(params.id);
    if (!existing || String(existing.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const body = await request.json();
    const { adminUserEmail, adminUserPassword, ...branchPayload } = body;

    const branch = await branchService.update(params.id, branchPayload);
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const hasAdminEmail = typeof adminUserEmail === 'string' && adminUserEmail.trim() !== '';
    const hasAdminPassword = typeof adminUserPassword === 'string' && adminUserPassword.trim() !== '';

    if (hasAdminEmail || hasAdminPassword) {
      const branchAdminUser = await findBranchAdminUser(String(organizationId), params.id);
      if (!branchAdminUser) {
        return NextResponse.json({ error: 'لا يوجد حساب مدير لهذا الفرع' }, { status: 404 });
      }

      await userService.update(String(branchAdminUser._id), {
        ...(hasAdminEmail ? { email: adminUserEmail.trim() } : {}),
        ...(hasAdminPassword ? { password: adminUserPassword.trim() } : {}),
      });
    }

    const updatedBranchAdminUser = await findBranchAdminUser(String(organizationId), params.id);

    return NextResponse.json({
      branch,
      branchAdminUser: updatedBranchAdminUser
        ? {
            _id: String(updatedBranchAdminUser._id),
            name: updatedBranchAdminUser.name,
            email: updatedBranchAdminUser.email,
          }
        : null,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);

    const existing = await branchService.getById(params.id);
    if (!existing || String(existing.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const deleted = await branchService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
