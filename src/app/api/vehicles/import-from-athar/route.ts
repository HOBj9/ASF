import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { VehicleService } from '@/lib/services/vehicle.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const vehicleService = new VehicleService();

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const rawObjects = body.objects;
    if (!Array.isArray(rawObjects) || rawObjects.length === 0) {
      return NextResponse.json(
        { error: 'يجب إرسال مصفوفة objects غير فارغة' },
        { status: 400 }
      );
    }

    const objects = rawObjects.map((o: any) => ({
      id: String(o?.id ?? ''),
      imei: String(o?.imei ?? ''),
      name: o?.name != null ? String(o.name) : undefined,
      plateNumber: o?.plateNumber != null ? (o.plateNumber === '' ? null : String(o.plateNumber)) : undefined,
    }));

    const invalid = objects.filter((o) => !o.id || !o.imei);
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: 'كل عنصر في objects يجب أن يحتوي على id و imei' },
        { status: 400 }
      );
    }

    const result = await vehicleService.importFromAtharObjects(branchId, objects);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
