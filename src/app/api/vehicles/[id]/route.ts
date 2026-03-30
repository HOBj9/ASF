export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { VehicleService } from '@/lib/services/vehicle.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const vehicleService = new VehicleService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const { id } = await params;

    const vehicle = await vehicleService.getById(id, branchId);
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);
    const { id } = await params;

    if ((body.trackingProvider || 'athar') === 'athar' && body.imei !== undefined && !String(body.imei || '').trim()) {
      return NextResponse.json(
        { error: 'رقم IMEI مطلوب للمركبات التي تعمل عبر أثر' },
        { status: 400 }
      );
    }

    const vehicle = await vehicleService.update(id, branchId, {
      name: body.name,
      plateNumber: body.plateNumber,
      imei: body.imei,
      trackingProvider: body.trackingProvider,
      fuelType: body.fuelType === 'diesel' ? 'diesel' : body.fuelType === 'gasoline' ? 'gasoline' : undefined,
      fuelPricePerKm:
        body.fuelPricePerKm === '' || body.fuelPricePerKm === undefined
          ? undefined
          : body.fuelPricePerKm === null
            ? null
            : Number(body.fuelPricePerKm),
      atharObjectId: body.atharObjectId,
      driverId: body.driverId,
      routeId: body.routeId,
      isActive: body.isActive,
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const { id } = await params;

    const deleted = await vehicleService.delete(id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
