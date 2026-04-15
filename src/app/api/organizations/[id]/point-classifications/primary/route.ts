export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { normalizeMobilePointClassification } from '@/lib/utils/mobile-point-classification.util';

const service = new PointClassificationService();

export async function GET(
  _request: Request,
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
    const primaries = await service.listPrimariesForOrganization(organizationId);
    return NextResponse.json({
      primaries: primaries.map(normalizeMobilePointClassification),
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
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const body = await request.json();
    const name = body.name?.trim();
    const nameAr = body.nameAr?.trim() || null;
    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const primary = await service.createPrimary(
      organizationId,
      { name, nameAr, order: body.order ?? 0 },
      null
    );
    return NextResponse.json({ primary }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
