import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { DriverService } from '@/lib/services/driver.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const driverService = new DriverService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.DRIVERS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const drivers = await driverService.getAll(municipalityId);
    return NextResponse.json({ drivers });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.DRIVERS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    const { name, phone, nationalId, assignedVehicleId, isActive } = body;
    if (!name) {
      return NextResponse.json(
        { error: 'اسم السائق مطلوب' },
        { status: 400 }
      );
    }

    const driver = await driverService.create({
      municipalityId,
      name,
      phone,
      nationalId,
      assignedVehicleId,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
