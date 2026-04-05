export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { CityService } from '@/lib/services/city.service';

const cityService = new CityService();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.CITIES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, cid } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json();
    const update: {
      governorateId?: string;
      name?: string;
      nameAr?: string | null;
      order?: number;
    } = {};

    if (body?.governorateId !== undefined) {
      update.governorateId = String(body.governorateId).trim();
    }
    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 });
      }
      update.name = name;
    }
    if (body?.nameAr !== undefined) {
      update.nameAr =
        body.nameAr != null && String(body.nameAr).trim() !== '' ? String(body.nameAr).trim() : null;
    }
    if (body?.order !== undefined && Number.isFinite(Number(body.order))) {
      update.order = Number(body.order);
    }

    const city = await cityService.update(cid, organizationId, update);
    if (!city) {
      return NextResponse.json({ error: 'المدينة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ city });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.CITIES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, cid } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    try {
      const ok = await cityService.delete(cid, organizationId);
      if (!ok) {
        return NextResponse.json({ error: 'المدينة غير موجودة' }, { status: 404 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'لا يمكن الحذف';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
