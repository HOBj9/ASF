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

    const route = await routeService.getById(params.id, branchId);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const route = await routeService.update(params.id, branchId, body);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const deleted = await routeService.delete(params.id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
