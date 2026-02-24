import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { OrganizationService } from '@/lib/services/organization.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import { RoleService } from '@/lib/services/role.service';
import { UserService } from '@/lib/services/user.service';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

const organizationService = new OrganizationService();
const roleService = new RoleService();
const userService = new UserService();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const organization = await organizationService.getById(params.id);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    let adminUser: { _id: string; name: string; email: string } | null = null;
    const orgAdminRole = await roleService.getByName('organization_admin');
    if (orgAdminRole) {
      await connectDB();
      const user = await User.findOne({
        organizationId: params.id,
        role: orgAdminRole._id,
      })
        .select('_id name email')
        .lean();
      if (user) {
        adminUser = {
          _id: String(user._id),
          name: user.name,
          email: user.email,
        };
      }
    }

    return NextResponse.json({ organization, adminUser });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const body = await request.json();
    const { adminUserName, adminUserEmail, adminUserPassword, ...orgBody } = body;

    const organization = await organizationService.update(params.id, orgBody);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    const hasAdminUpdate = adminUserName !== undefined || adminUserEmail !== undefined || (adminUserPassword !== undefined && adminUserPassword !== '');
    if (hasAdminUpdate) {
      const orgAdminRole = await roleService.getByName('organization_admin');
      if (orgAdminRole) {
        await connectDB();
        const adminUserDoc = await User.findOne({
          organizationId: params.id,
          role: orgAdminRole._id,
        }).select('_id').lean();
        if (adminUserDoc) {
          const updateData: { name?: string; email?: string; password?: string } = {};
          if (adminUserName !== undefined && adminUserName !== '') updateData.name = adminUserName;
          if (adminUserEmail !== undefined && adminUserEmail !== '') updateData.email = adminUserEmail;
          if (adminUserPassword !== undefined && adminUserPassword !== '') updateData.password = adminUserPassword;
          if (Object.keys(updateData).length > 0) {
            await userService.update(String(adminUserDoc._id), updateData);
          }
        }
      }
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const deleted = await organizationService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
