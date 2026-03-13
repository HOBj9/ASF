import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteZoneService } from '@/lib/services/route-zone.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';

const service = new RouteZoneService();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.ROUTE_ZONES,
      permissionActions.UPDATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const body = await request.json();
    const { branchId: bodyBranchId, cityId, name, nameAr, order } = body;

    const branchId = resolveBranchId(session, bodyBranchId);

    const zone = await service.update(id, branchId, {
      cityId,
      name: name?.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? undefined,
    });

    if (!zone) {
      return NextResponse.json({ error: 'المنطقة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ zone });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.ROUTE_ZONES,
      permissionActions.DELETE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const branchIdParam = searchParams.get('branchId');

    const branchId = resolveBranchId(session, branchIdParam);

    const deleted = await service.delete(id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المنطقة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
