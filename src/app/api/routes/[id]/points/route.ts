import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeService = new RouteService();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const routePoints = await routeService.getRoutePoints(params.id, branchId);
    return NextResponse.json({ routePoints });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const points = Array.isArray(body.points) ? body.points : [];
    if (points.length === 0) {
      return NextResponse.json(
        { error: 'يجب إرسال حاويات المسار' },
        { status: 400 }
      );
    }

    const routePoints = await routeService.setRoutePoints(params.id, branchId, points);
    return NextResponse.json({ routePoints });
  } catch (error: any) {
    return handleApiError(error);
  }
}
