export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';
import { BranchService } from '@/lib/services/branch.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';

const userService = new UserService();
const roleService = new RoleService();
const branchService = new BranchService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.USERS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const lineSupervisorRole = await roleService.getByName('line_supervisor');
    if (!lineSupervisorRole) {
      return NextResponse.json({ users: [], branches: [] });
    }

    const users = await userService.getByOrganizationAndRole(organizationId, lineSupervisorRole._id.toString());
    const branches = await branchService.getAll(organizationId);

    return NextResponse.json({
      users: users.map((u: any) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        branchId: u.branchId,
        branch: u.branchId ? (branches.find((b: any) => String(b._id) === String(u.branchId)) || null) : null,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      branches,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.USERS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json();
    const { name, email, password, isActive, branchId } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }
    if (!branchId || String(branchId).trim() === '') {
      return NextResponse.json(
        { error: 'الفرع مطلوب. مشرف الخط يجب أن يكون مرتبطاً بفرع واحد.' },
        { status: 400 }
      );
    }

    const branches = await branchService.getAll(organizationId);
    const branchExists = branches.some((b: any) => String(b._id) === String(branchId));
    if (!branchExists) {
      return NextResponse.json({ error: 'الفرع المحدد غير تابع للمؤسسة' }, { status: 400 });
    }

    const lineSupervisorRole = await roleService.getByName('line_supervisor');
    if (!lineSupervisorRole) {
      return NextResponse.json({ error: 'دور مشرف الخط غير موجود. يرجى تشغيل مزامنة الصلاحيات.' }, { status: 500 });
    }

    const user = await userService.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: lineSupervisorRole._id.toString(),
      organizationId,
      branchId: String(branchId).trim(),
      isActive: isActive !== false,
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}
