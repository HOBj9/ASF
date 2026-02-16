import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { BranchService } from '@/lib/services/branch.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { cloneOrganizationMaterialTreeToBranch } from '@/lib/services/material-tree.service';
import { PointService } from '@/lib/services/point.service';

const branchService = new BranchService();
const pointService = new PointService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));

    const branches = await branchService.getAll(organizationId);
    return NextResponse.json({ branches });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.BRANCHES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();

    const organizationId = await resolveOrganizationId(session, body.organizationId || null);

    const {
      name,
      nameAr,
      branchTypeLabel,
      governorate,
      areaName,
      addressText,
      centerLat,
      centerLng,
      timezone,
      atharKey,
      fuelPricePerKmGasoline,
      fuelPricePerKmDiesel,
      isActive,
      adminUserName,
      adminUserEmail,
      adminUserPassword,
    } = body;

    if (!name || centerLat === undefined || centerLng === undefined) {
      return NextResponse.json(
        { error: 'الاسم والإحداثيات مطلوبة' },
        { status: 400 }
      );
    }

    const branch = await branchService.create({
      organizationId,
      name,
      nameAr,
      branchTypeLabel,
      governorate,
      areaName,
      addressText,
      centerLat: Number(centerLat),
      centerLng: Number(centerLng),
      timezone,
      atharKey,
      fuelPricePerKmGasoline: fuelPricePerKmGasoline != null ? Number(fuelPricePerKmGasoline) : undefined,
      fuelPricePerKmDiesel: fuelPricePerKmDiesel != null ? Number(fuelPricePerKmDiesel) : undefined,
      isActive: isActive ?? true,
    });

    try {
      if (organizationId) {
        await cloneOrganizationMaterialTreeToBranch(organizationId, branch._id.toString());
        await pointService.cloneOrganizationPointsToBranch(organizationId, branch._id.toString());
      }

      if (adminUserName && adminUserEmail && adminUserPassword) {
        const { UserService } = await import('@/lib/services/user.service');
        const { RoleService } = await import('@/lib/services/role.service');
        const userService = new UserService();
        const roleService = new RoleService();
        const defaultRole =
          (await roleService.getByName('branch_admin')) || (await roleService.getByName('branch_user'));
        if (!defaultRole) {
          throw new Error('لم يتم العثور على دور الفرع');
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
      }
    } catch (error) {
      await branchService.delete(branch._id.toString());
      throw error;
    }

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

