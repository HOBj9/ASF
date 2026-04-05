export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { OrganizationService } from '@/lib/services/organization.service';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';

const organizationService = new OrganizationService();
const userService = new UserService();
const roleService = new RoleService();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const organization = await organizationService.getById(id);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    let adminUser: { name: string; email: string } | null = null;
    const orgAdminRole = await roleService.getByName('organization_admin');
    if (orgAdminRole) {
      const admins = await userService.getByOrganizationAndRole(id, orgAdminRole._id.toString());
      const u = admins[0];
      if (u) {
        adminUser = { name: u.name || '', email: u.email || '' };
      }
    }

    return NextResponse.json({ organization, adminUser });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json();

    const updateData: {
      name?: string;
      slug?: string;
      type?: string | null;
      labels?: Record<string, string>;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.labels !== undefined) updateData.labels = body.labels;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const organization = await organizationService.update(id, updateData);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    const orgAdminRole = await roleService.getByName('organization_admin');
    if (orgAdminRole) {
      const admins = await userService.getByOrganizationAndRole(id, orgAdminRole._id.toString());
      const primary = admins[0];
      if (primary?._id) {
        const uid = String(primary._id);
        const userUpdate: { name?: string; email?: string; password?: string } = {};
        if (typeof body.adminUserName === 'string' && body.adminUserName.trim()) {
          userUpdate.name = body.adminUserName.trim();
        }
        if (typeof body.adminUserEmail === 'string' && body.adminUserEmail.trim()) {
          userUpdate.email = body.adminUserEmail.trim();
        }
        if (typeof body.adminUserPassword === 'string' && body.adminUserPassword.length > 0) {
          userUpdate.password = body.adminUserPassword;
        }
        if (Object.keys(userUpdate).length > 0) {
          await userService.update(uid, userUpdate);
        }
      }
    }

    return NextResponse.json({ organization });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const deleted = await organizationService.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
