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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const route = await routeService.getById(id, branchId);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const { name, description, color, isActive, zoneIds, workScheduleId, path } = body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (zoneIds !== undefined) updateData.zoneIds = zoneIds;
    if (workScheduleId !== undefined) updateData.workScheduleId = workScheduleId;
    if (path !== undefined) updateData.path = path;

    const route = await routeService.update(id, branchId, updateData as any);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const deleted = await routeService.delete(id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
