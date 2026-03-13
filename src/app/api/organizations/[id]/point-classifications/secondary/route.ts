import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new PointClassificationService();

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { name, nameAr, order, primaryClassificationId } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }
    if (!primaryClassificationId) {
      return NextResponse.json({ error: 'التصنيف الأساسي مطلوب' }, { status: 400 });
    }

    const secondary = await service.createSecondary(
      organizationId,
      primaryClassificationId,
      { name: name.trim(), nameAr: nameAr?.trim() || null, order: order ?? 0 },
      null
    );

    return NextResponse.json({ secondary }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
