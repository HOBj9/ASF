import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { WorkScheduleService } from '@/lib/services/work-schedule.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import connectDB from '@/lib/mongodb';
import WorkSchedule from '@/models/WorkSchedule';
import Branch from '@/models/Branch';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationIdParam = searchParams.get('organizationId');
    const branchIdParam = searchParams.get('branchId');

    await connectDB();
    const schedule = await WorkSchedule.findById(id).lean();
    if (!schedule) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    const s = schedule as any;
    const orgId = String(s.organizationId);
    const sBranchId = s.branchId ? String(s.branchId) : null;

    if (sBranchId) {
      const branchId = resolveBranchId(session, branchIdParam || sBranchId);
      await ensureBranchAccess(session, branchId);
      if (branchId !== sBranchId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
    } else {
      const organizationId = await resolveOrganizationId(
        session,
        organizationIdParam || orgId
      );
      await ensureOrgAccess(session, organizationId);
      if (organizationId !== orgId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
    }

    const context = sBranchId
      ? { branchId: sBranchId }
      : { organizationId: orgId };
    const result = await service.getById(id, context);
    if (!result) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ schedule: result });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.UPDATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const body = await request.json();
    const { organizationId: bodyOrgId, branchId: bodyBranchId, name, nameAr, order, days } = body;

    await connectDB();
    const schedule = await WorkSchedule.findById(id).lean();
    if (!schedule) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    const s = schedule as any;
    const orgId = String(s.organizationId);
    const sBranchId = s.branchId ? String(s.branchId) : null;

    let context: { organizationId?: string; branchId?: string };
    if (sBranchId) {
      const branchId = resolveBranchId(session, bodyBranchId || sBranchId);
      await ensureBranchAccess(session, branchId);
      if (branchId !== sBranchId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
      context = { branchId: sBranchId };
    } else {
      const organizationId = await resolveOrganizationId(
        session,
        bodyOrgId || orgId
      );
      await ensureOrgAccess(session, organizationId);
      if (organizationId !== orgId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
      context = { organizationId: orgId };
    }

    const updated = await service.update(id, context, {
      name: name?.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? undefined,
      days: Array.isArray(days) ? days : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ schedule: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.DELETE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationIdParam = searchParams.get('organizationId');
    const branchIdParam = searchParams.get('branchId');

    await connectDB();
    const schedule = await WorkSchedule.findById(id).lean();
    if (!schedule) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    const s = schedule as any;
    const orgId = String(s.organizationId);
    const sBranchId = s.branchId ? String(s.branchId) : null;

    let context: { organizationId?: string; branchId?: string };
    if (sBranchId) {
      const branchId = resolveBranchId(session, branchIdParam || sBranchId);
      await ensureBranchAccess(session, branchId);
      if (branchId !== sBranchId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
      context = { branchId: sBranchId };
    } else {
      const organizationId = await resolveOrganizationId(
        session,
        organizationIdParam || orgId
      );
      await ensureOrgAccess(session, organizationId);
      if (organizationId !== orgId) {
        return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
      }
      context = { organizationId: orgId };
    }

    const deleted = await service.delete(id, context);
    if (!deleted) {
      return NextResponse.json({ error: 'جدول العمل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
