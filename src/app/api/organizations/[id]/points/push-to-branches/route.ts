export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { PointService } from '@/lib/services/point.service';

const pointService = new PointService();

/**
 * POST: نسخ نقطة على مستوى المؤسسة إلى جميع فروعها (التي لا تملك نفس الاسم بعد)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINTS,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json();
    const pointId = body?.pointId as string | undefined;
    if (!pointId) {
      return NextResponse.json({ error: 'معرّف النقطة مطلوب' }, { status: 400 });
    }

    const pushed = await pointService.pushPointToAllBranches(organizationId, pointId);
    return NextResponse.json({ pushed });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
