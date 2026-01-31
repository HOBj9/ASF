import { NextResponse } from 'next/server';
import { requireAuth, requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { VehicleService } from '@/lib/services/vehicle.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const vehicleService = new VehicleService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const vehicles = await vehicleService.getAll(municipalityId);
    return NextResponse.json({ vehicles });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    const { name, plateNumber, imei, atharObjectId, driverId, routeId, isActive } = body;
    if (!name || !imei) {
      return NextResponse.json(
        { error: 'الاسم و IMEI مطلوبان' },
        { status: 400 }
      );
    }

    const vehicle = await vehicleService.create({
      municipalityId,
      name,
      plateNumber,
      imei,
      atharObjectId,
      driverId,
      routeId,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
