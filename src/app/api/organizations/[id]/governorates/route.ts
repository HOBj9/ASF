export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { GovernorateService } from '@/lib/services/governorate.service';

const governorateService = new GovernorateService();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const governorates = await governorateService.list(organizationId);
    return NextResponse.json({ governorates });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.GOVERNORATES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const nameAr =
      body?.nameAr != null && String(body.nameAr).trim() !== '' ? String(body.nameAr).trim() : null;
    const order = body?.order != null && Number.isFinite(Number(body.order)) ? Number(body.order) : 0;

    const governorate = await governorateService.create(organizationId, {
      name,
      nameAr,
      order,
    });

    return NextResponse.json({ governorate }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
