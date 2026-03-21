export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeService = new RouteService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: routeId } = await params;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const routePoints = await routeService.getRoutePoints(routeId, branchId);
    return NextResponse.json({
      routePoints: routePoints.map((rp: any) => ({
        _id: rp._id,
        pointId: rp.pointId,
        order: rp.order,
      })),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: routeId } = await params;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const points = Array.isArray(body.points) ? body.points : [];
    if (points.length === 0) {
      return NextResponse.json(
        { error: 'يجب إرسال قائمة نقاط (points)' },
        { status: 400 }
      );
    }

    const normalized = points.map((p: any, index: number) => ({
      pointId: String(p.pointId ?? p.point_id ?? ''),
      order: typeof p.order === 'number' ? p.order : index,
    }));

    await routeService.setRoutePoints(routeId, branchId, normalized);
    const routePoints = await routeService.getRoutePoints(routeId, branchId);
    return NextResponse.json({
      routePoints: routePoints.map((rp: any) => ({
        _id: rp._id,
        pointId: rp.pointId,
        order: rp.order,
      })),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
