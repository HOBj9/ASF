import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { WorkScheduleService } from '@/lib/services/work-schedule.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new WorkScheduleService();

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return;
  const sessionOrg = session?.user?.organizationId?.toString?.();
  if (sessionOrg === organizationId) return;
  const branchId = session?.user?.branchId?.toString?.();
  if (branchId) {
    await connectDB();
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch && String(branch.organizationId) === organizationId) return;
  }
  throw new Error('لا يمكنك الوصول إلى هذه المؤسسة');
}

async function ensureBranchAccess(session: any, branchId: string): Promise<void> {
  if (isAdmin(session?.user?.role) || isOrganizationAdmin(session?.user?.role)) return;
  const sessionBranchId = session?.user?.branchId?.toString?.();
  if (sessionBranchId === branchId) return;
  throw new Error('لا يمكنك الوصول إلى هذا الفرع');
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const organizationIdParam = searchParams.get('organizationId');
    const branchIdParam = searchParams.get('branchId');

    if (branchIdParam) {
      const branchId = resolveBranchId(session, branchIdParam);
      await ensureBranchAccess(session, branchId);
      const schedules = await service.getAllForBranch(branchId);
      return NextResponse.json({ schedules });
    }

    if (organizationIdParam) {
      const organizationId = await resolveOrganizationId(session, organizationIdParam);
      await ensureOrgAccess(session, organizationId);
      const schedules = await service.getAllForOrganization(organizationId);
      return NextResponse.json({ schedules });
    }

    return NextResponse.json(
      { error: 'يرجى تحديد organizationId أو branchId' },
      { status: 400 }
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const {
      organizationId: bodyOrgId,
      branchId: bodyBranchId,
      sourceWorkScheduleId,
      name,
      nameAr,
      order,
      days,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const organizationId = await resolveOrganizationId(session, bodyOrgId);
    await ensureOrgAccess(session, organizationId);

    let branchId: string | null = null;
    if (bodyBranchId) {
      branchId = resolveBranchId(session, bodyBranchId);
      await ensureBranchAccess(session, branchId);
    }

    const schedule = await service.create({
      organizationId,
      branchId: branchId || undefined,
      sourceWorkScheduleId: sourceWorkScheduleId || undefined,
      name: name.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? 0,
      days: Array.isArray(days) ? days : [],
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
