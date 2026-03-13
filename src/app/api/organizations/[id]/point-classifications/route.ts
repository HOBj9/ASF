export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';

const service = new PointClassificationService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const { primaries, secondaries } = await service.listForOrganization(organizationId);
    return NextResponse.json({ primaries, secondaries });
  } catch (error: any) {
    return handleApiError(error);
  }
}
