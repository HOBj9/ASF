import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { DriverService } from '@/lib/services/driver.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const driverService = new DriverService();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.DRIVERS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const driver = await driverService.getById(params.id, municipalityId);
    if (!driver) {
      return NextResponse.json({ error: 'السائق غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ driver });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.DRIVERS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    const driver = await driverService.update(params.id, municipalityId, body);
    if (!driver) {
      return NextResponse.json({ error: 'السائق غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ driver });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.DRIVERS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const deleted = await driverService.delete(params.id, municipalityId);
    if (!deleted) {
      return NextResponse.json({ error: 'السائق غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
