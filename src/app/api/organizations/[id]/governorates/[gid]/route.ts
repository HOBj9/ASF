import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { GovernorateService } from '@/lib/services/governorate.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new GovernorateService();

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; gid: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.UPDATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId, gid } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { name, nameAr, order } = body;

    const governorate = await service.update(gid, organizationId, {
      name: name?.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? undefined,
    });

    if (!governorate) {
      return NextResponse.json({ error: 'المحافظة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ governorate });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; gid: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.DELETE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId, gid } = await params;
    await ensureOrgAccess(session, organizationId);

    const deleted = await service.delete(gid, organizationId);
    if (!deleted) {
      return NextResponse.json({ error: 'المحافظة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
