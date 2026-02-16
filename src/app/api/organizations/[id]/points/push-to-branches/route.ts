import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const pointService = new PointService();

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
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json().catch(() => ({}));
    const pointId = body.pointId ?? body.point_id;
    if (!pointId) {
      return NextResponse.json(
        { error: 'معرف النقطة مطلوب (pointId)' },
        { status: 400 }
      );
    }

    const created = await pointService.pushPointToAllBranches(organizationId, String(pointId));
    return NextResponse.json({ pushed: created });
  } catch (error: any) {
    return handleApiError(error);
  }
}
