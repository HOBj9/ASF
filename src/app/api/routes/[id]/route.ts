import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeService = new RouteService();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const { id } = await params;
    const route = await routeService.getById(id, branchId);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.zoneIds !== undefined) updateData.zoneIds = Array.isArray(body.zoneIds) ? body.zoneIds : [];
    if ('workScheduleId' in body) {
      const ws = body.workScheduleId;
      updateData.workScheduleId = (ws && String(ws).trim()) ? String(ws).trim() : null;
    }
    if (body.path !== undefined) {
      const p = body.path;
      if (p && typeof p === 'object' && p.type === 'LineString' && Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
        updateData.path = { type: 'LineString', coordinates: p.coordinates };
      } else {
        updateData.path = null;
      }
    }

    const { id } = await params;
    const route = await routeService.update(id, branchId, updateData);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const { id } = await params;
    const deleted = await routeService.delete(id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
