export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { BranchService } from '@/lib/services/branch.service';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';

const branchService = new BranchService();
const userService = new UserService();
const roleService = new RoleService();

export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const branches = await branchService.getAll();
    return NextResponse.json({ branches });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      organizationId,
      name,
      nameAr,
      governorate,
      areaName,
      addressText,
      centerLat,
      centerLng,
      timezone,
      atharKey,
      isActive,
      adminUserName,
      adminUserEmail,
      adminUserPassword,
    } = body;

    if (!organizationId || !name || !governorate || centerLat === undefined || centerLng === undefined) {
      return NextResponse.json(
        { error: 'الحقول المطلوبة: المؤسسة، الاسم، المحافظة، والإحداثيات' },
        { status: 400 }
      );
    }

    if (!adminUserName || !adminUserEmail || !adminUserPassword) {
      return NextResponse.json(
        { error: 'بيانات مستخدم البلدية مطلوبة (الاسم، البريد، كلمة المرور)' },
        { status: 400 }
      );
    }

    const branch = await branchService.create({
      organizationId,
      name,
      nameAr,
      governorate,
      areaName,
      addressText,
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      timezone,
      atharKey,
      isActive: isActive ?? true,
    });

    try {
      const defaultRole =
        (await roleService.getByName('branch_admin')) ||
        (await roleService.getByName('user'));
      if (!defaultRole) {
        throw new Error('لم يتم العثور على دور المستخدم الافتراضي');
      }

      await userService.create({
        name: adminUserName,
        email: adminUserEmail,
        password: adminUserPassword,
        role: defaultRole._id.toString(),
        organizationId,
        branchId: branch._id.toString(),
        isActive: true,
      });
    } catch (error) {
      await branchService.delete(branch._id.toString());
      throw error;
    }

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
