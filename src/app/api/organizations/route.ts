export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { OrganizationService } from '@/lib/services/organization.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';

const organizationService = new OrganizationService();
const userService = new UserService();
const roleService = new RoleService();

export async function GET() {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;

    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const organizations = await organizationService.getAll();
    return NextResponse.json({ organizations });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, type, labels, isActive, adminUserName, adminUserEmail, adminUserPassword } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'الاسم والرمز مطلوبان' }, { status: 400 });
    }
    if (!adminUserName || !adminUserEmail || !adminUserPassword) {
      return NextResponse.json({ error: 'بيانات حساب مدير المؤسسة مطلوبة' }, { status: 400 });
    }

    const organization = await organizationService.create({
      name,
      slug,
      type,
      labels,
      isActive,
    });

    const organizationAdminRole = await roleService.getByName('organization_admin');
    if (!organizationAdminRole) {
      return NextResponse.json({ error: 'دور مدير المؤسسة غير موجود' }, { status: 500 });
    }

    const organizationAdminUser = await userService.create({
      name: adminUserName,
      email: adminUserEmail,
      password: adminUserPassword,
      role: organizationAdminRole._id.toString(),
      organizationId: organization._id.toString(),
      isActive: true,
    });

    return NextResponse.json(
      {
        organization,
        organizationAdminUser: {
          _id: organizationAdminUser._id,
          name: organizationAdminUser.name,
          email: organizationAdminUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

