export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { UserService } from '@/lib/services/user.service';
import { RoleService } from '@/lib/services/role.service';
import { BranchService } from '@/lib/services/branch.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import Vehicle from '@/models/Vehicle';
import User from '@/models/User';

const userService = new UserService();
const roleService = new RoleService();
const branchService = new BranchService();

async function validateTrackingVehicleAssignment(params: {
  organizationId: string;
  branchId: string;
  trackingVehicleId?: string | null;
  excludeUserId?: string | null;
  lineSupervisorRoleId: string;
}) {
  if (!params.trackingVehicleId) return null;

  const vehicle = await Vehicle.findOne({
    _id: params.trackingVehicleId,
    branchId: params.branchId,
  })
    .select('_id name plateNumber branchId')
    .lean();

  if (!vehicle) {
    const error: any = new Error('المركبة المحددة غير موجودة أو لا تتبع للفرع');
    error.status = 400;
    throw error;
  }

  const conflictingSupervisor = await User.findOne({
    role: params.lineSupervisorRoleId,
    organizationId: params.organizationId,
    trackingVehicleId: params.trackingVehicleId,
    ...(params.excludeUserId ? { _id: { $ne: params.excludeUserId } } : {}),
  })
    .select('_id name')
    .lean();

  if (conflictingSupervisor) {
    const error: any = new Error('هذه المركبة مرتبطة بالفعل بمشرف خط آخر');
    error.status = 400;
    throw error;
  }

  return vehicle;
}

export async function GET(
  _request: Request,
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
      return NextResponse.json({ users: [], branches: [], vehicles: [] });
    }

    const [users, branches] = await Promise.all([
      userService.getByOrganizationAndRole(organizationId, lineSupervisorRole._id.toString()),
      branchService.getAll(organizationId),
    ]);

    const branchIds = branches.map((branch: any) => branch._id);
    const branchVehicles = branchIds.length
      ? await Vehicle.find({ branchId: { $in: branchIds }, isActive: true })
          .select('_id name plateNumber branchId trackingProvider')
          .sort({ name: 1 })
          .lean()
      : [];

    return NextResponse.json({
      users: users.map((user: any) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        trackingVehicleId: user.trackingVehicleId || null,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
      branches,
      vehicles: branchVehicles,
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
    const { name, email, password, isActive, branchId, trackingVehicleId } = body;

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
    const branchExists = branches.some((branch: any) => String(branch._id) === String(branchId));
    if (!branchExists) {
      return NextResponse.json({ error: 'الفرع المحدد غير تابع للمؤسسة' }, { status: 400 });
    }

    const lineSupervisorRole = await roleService.getByName('line_supervisor');
    if (!lineSupervisorRole) {
      return NextResponse.json(
        { error: 'دور مشرف الخط غير موجود. يرجى تشغيل مزامنة الصلاحيات.' },
        { status: 500 }
      );
    }

    await validateTrackingVehicleAssignment({
      organizationId,
      branchId: String(branchId).trim(),
      trackingVehicleId: trackingVehicleId || null,
      lineSupervisorRoleId: lineSupervisorRole._id.toString(),
    });

    const user = await userService.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: lineSupervisorRole._id.toString(),
      organizationId,
      branchId: String(branchId).trim(),
      trackingVehicleId: trackingVehicleId || undefined,
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
          trackingVehicleId: user.trackingVehicleId || null,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.USERS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const body = await request.json();
    const { userId, name, email, password, branchId, trackingVehicleId, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 });
    }

    const lineSupervisorRole = await roleService.getByName('line_supervisor');
    if (!lineSupervisorRole) {
      return NextResponse.json(
        { error: 'دور مشرف الخط غير موجود. يرجى تشغيل مزامنة الصلاحيات.' },
        { status: 500 }
      );
    }

    const existingUser = await User.findOne({
      _id: userId,
      organizationId,
      role: lineSupervisorRole._id,
    })
      .select('_id branchId')
      .lean();

    if (!existingUser) {
      return NextResponse.json({ error: 'مشرف الخط غير موجود' }, { status: 404 });
    }

    const nextBranchId = String(branchId || existingUser.branchId || '').trim();
    if (!nextBranchId) {
      return NextResponse.json({ error: 'الفرع مطلوب' }, { status: 400 });
    }

    const branches = await branchService.getAll(organizationId);
    const branchExists = branches.some((branch: any) => String(branch._id) === nextBranchId);
    if (!branchExists) {
      return NextResponse.json({ error: 'الفرع المحدد غير تابع للمؤسسة' }, { status: 400 });
    }

    await validateTrackingVehicleAssignment({
      organizationId,
      branchId: nextBranchId,
      trackingVehicleId: trackingVehicleId === undefined ? undefined : trackingVehicleId || null,
      excludeUserId: String(userId),
      lineSupervisorRoleId: lineSupervisorRole._id.toString(),
    });

    const updatedUser = await userService.update(String(userId), {
      name,
      email,
      password,
      branchId: nextBranchId,
      trackingVehicleId: trackingVehicleId === undefined ? undefined : trackingVehicleId || null,
      isActive,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return handleApiError(error);
  }
}
