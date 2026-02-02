import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { VehicleService } from '@/lib/services/vehicle.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const vehicleService = new VehicleService();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const vehicle = await vehicleService.getById(params.id, branchId);
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const vehicle = await vehicleService.update(params.id, branchId, body);
    if (!vehicle) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const deleted = await vehicleService.delete(params.id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المركبة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
