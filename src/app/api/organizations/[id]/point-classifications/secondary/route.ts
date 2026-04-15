export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { normalizeMobilePointClassification } from '@/lib/utils/mobile-point-classification.util';

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
    const { searchParams } = new URL(request.url);
    const secondaries = await service.listSecondariesForOrganization(
      organizationId,
      searchParams.get('primaryClassificationId')
    );
    return NextResponse.json({
      secondaries: secondaries.map(normalizeMobilePointClassification),
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
    const primaryClassificationId = body.primaryClassificationId;
    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }
    if (!primaryClassificationId) {
      return NextResponse.json({ error: 'الفئة الأساسية مطلوبة' }, { status: 400 });
    }

    const secondary = await service.createSecondary(
      organizationId,
      primaryClassificationId,
      { name, nameAr, order: body.order ?? 0 },
      null
    );
    return NextResponse.json({ secondary }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
