export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';

const service = new PointClassificationService();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; secondaryId: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.UPDATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, secondaryId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const body = await request.json();
    const secondary = await service.updateSecondary(secondaryId, organizationId, {
      name: body.name?.trim(),
      nameAr: body.nameAr !== undefined ? (body.nameAr?.trim() || null) : undefined,
      order: body.order,
    });
    return NextResponse.json({ secondary });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; secondaryId: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.DELETE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, secondaryId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    await service.deleteSecondary(secondaryId, organizationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
