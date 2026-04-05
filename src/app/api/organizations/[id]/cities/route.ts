export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { CityService } from '@/lib/services/city.service';

const cityService = new CityService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.CITIES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const { searchParams } = new URL(request.url);
    const governorateId = searchParams.get('governorateId') || undefined;

    const cities = await cityService.list(organizationId, governorateId || null);
    return NextResponse.json({ cities });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.CITIES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json();
    const governorateId = typeof body?.governorateId === 'string' ? body.governorateId.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!governorateId || !name) {
      return NextResponse.json({ error: 'المحافظة والاسم مطلوبان' }, { status: 400 });
    }

    const nameAr =
      body?.nameAr != null && String(body.nameAr).trim() !== '' ? String(body.nameAr).trim() : null;
    const order = body?.order != null && Number.isFinite(Number(body.order)) ? Number(body.order) : 0;

    const city = await cityService.create(organizationId, {
      governorateId,
      name,
      nameAr,
      order,
    });

    return NextResponse.json({ city }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
