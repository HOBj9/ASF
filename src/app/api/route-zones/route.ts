export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteZoneService } from '@/lib/services/route-zone.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';

const service = new RouteZoneService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.ROUTE_ZONES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchIdParam = searchParams.get('branchId');
    const cityId = searchParams.get('cityId');

    const branchId = resolveBranchId(session, branchIdParam);

    const zones = await service.list(branchId, cityId || undefined);
    return NextResponse.json({ zones });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.ROUTE_ZONES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { branchId: bodyBranchId, cityId, name, nameAr, order } = body;

    const branchId = resolveBranchId(session, bodyBranchId);

    if (!cityId || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'المدينة والاسم مطلوبان' },
        { status: 400 }
      );
    }

    const zone = await service.create(branchId, {
      branchId,
      cityId,
      name: name.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? 0,
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
