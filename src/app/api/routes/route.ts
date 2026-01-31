import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeService = new RouteService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const routes = await routeService.getAll(municipalityId);
    return NextResponse.json({ routes });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    const { name, description, isActive } = body;
    if (!name) {
      return NextResponse.json(
        { error: 'اسم المسار مطلوب' },
        { status: 400 }
      );
    }

    const route = await routeService.create({
      municipalityId,
      name,
      description,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
