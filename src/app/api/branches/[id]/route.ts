export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { BranchService } from '@/lib/services/branch.service';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const branchService = new BranchService();
const userService = new UserService();
const roleService = new RoleService();

function branchAccessError(): NextResponse {
  return NextResponse.json({ error: 'غير مصرح بعرض أو تعديل هذا الفرع' }, { status: 403 });
}

async function assertCanAccessBranch(session: any, branch: { _id: unknown; organizationId: unknown }): Promise<NextResponse | null> {
  const role = session?.user?.role;
  if (isAdmin(role)) return null;

  const branchOrgId = String(branch.organizationId);
  const sessionOrgId = session?.user?.organizationId ? String(session.user.organizationId) : '';
  const sessionBranchId = session?.user?.branchId ? String(session.user.branchId) : '';

  if (isOrganizationAdmin(role)) {
    if (sessionOrgId && sessionOrgId === branchOrgId) return null;
    return branchAccessError();
  }

  if (sessionBranchId && sessionBranchId === String(branch._id)) return null;

  return branchAccessError();
}

async function findBranchAdminUser(branchId: string): Promise<{ _id: string; name: string; email: string } | null> {
  await connectDB();
  const branchAdminRole = await roleService.getByName('branch_admin');
  if (branchAdminRole) {
    const u = await User.findOne({ branchId, role: branchAdminRole._id })
      .select('name email')
      .lean()
      .exec();
    if (u?._id) {
      return { _id: String(u._id), name: u.name || '', email: u.email || '' };
    }
  }
  const fallback = await User.findOne({ branchId })
    .select('name email')
    .lean()
    .exec();
  if (fallback?._id) {
    return { _id: String(fallback._id), name: fallback.name || '', email: fallback.email || '' };
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;

    const branch = await branchService.getById(id);
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const denied = await assertCanAccessBranch(session, branch);
    if (denied) return denied;

    const branchAdminUser = await findBranchAdminUser(id);

    return NextResponse.json({ branch, branchAdminUser });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const body = await request.json();

    const branch = await branchService.getById(id);
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const denied = await assertCanAccessBranch(session, branch);
    if (denied) return denied;

    const { adminUserName, adminUserEmail, adminUserPassword } = body;

    const updatePayload: Record<string, unknown> = {};
    const pick = (key: string) => {
      if (body[key] !== undefined) updatePayload[key] = body[key];
    };
    pick('name');
    pick('nameAr');
    pick('branchTypeLabel');
    pick('governorate');
    pick('areaName');
    pick('addressText');
    pick('centerLat');
    pick('centerLng');
    pick('timezone');
    pick('atharKey');
    pick('fuelPricePerKmGasoline');
    pick('fuelPricePerKmDiesel');
    pick('labels');
    pick('isActive');
    if (updatePayload.centerLat !== undefined) updatePayload.centerLat = Number(updatePayload.centerLat);
    if (updatePayload.centerLng !== undefined) updatePayload.centerLng = Number(updatePayload.centerLng);
    if (updatePayload.fuelPricePerKmGasoline !== undefined) {
      updatePayload.fuelPricePerKmGasoline =
        updatePayload.fuelPricePerKmGasoline == null ? null : Number(updatePayload.fuelPricePerKmGasoline);
    }
    if (updatePayload.fuelPricePerKmDiesel !== undefined) {
      updatePayload.fuelPricePerKmDiesel =
        updatePayload.fuelPricePerKmDiesel == null ? null : Number(updatePayload.fuelPricePerKmDiesel);
    }

    const updated = await branchService.update(id, updatePayload as any);
    if (!updated) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const emailTrim = typeof adminUserEmail === 'string' ? adminUserEmail.trim() : '';
    const passwordTrim = typeof adminUserPassword === 'string' ? adminUserPassword.trim() : '';
    const nameTrim = typeof adminUserName === 'string' ? adminUserName.trim() : '';

    if (emailTrim || passwordTrim || nameTrim) {
      const admin = await findBranchAdminUser(id);
      if (!admin) {
        return NextResponse.json(
          { error: 'لا يوجد مستخدم مرتبط بهذا الفرع لتحديث بيانات الدخول' },
          { status: 400 }
        );
      }
      await userService.update(admin._id, {
        ...(nameTrim ? { name: nameTrim } : {}),
        ...(emailTrim ? { email: emailTrim } : {}),
        ...(passwordTrim ? { password: passwordTrim } : {}),
      });
    }

    const branchAdminUser = await findBranchAdminUser(id);
    return NextResponse.json({ branch: updated, branchAdminUser });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;

    const branch = await branchService.getById(id);
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const denied = await assertCanAccessBranch(session, branch);
    if (denied) return denied;

    const deleted = await branchService.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
