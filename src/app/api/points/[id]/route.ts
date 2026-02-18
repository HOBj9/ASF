import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { AtharService } from '@/lib/services/athar.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const point = await pointService.getById(params.id, branchId);
    if (!point) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ point });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    if ('zoneId' in body) {
      delete body.zoneId;
    }

    const point = await pointService.update(params.id, branchId, body);
    if (!point) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ point });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const deleteFromAthar = searchParams.get('deleteFromAthar') === 'true' || searchParams.get('deleteFromAthar') === '1';

    const point = await pointService.getById(params.id, branchId);
    if (!point) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    if (deleteFromAthar && point.zoneId && String(point.zoneId).trim()) {
      try {
        const atharService = await AtharService.forBranch(branchId);
        await atharService.deleteZone(String(point.zoneId));
      } catch (atharErr: any) {
        console.warn('[DELETE point] Athar deleteZone failed:', atharErr?.message);
        return NextResponse.json(
          { error: atharErr?.message || 'فشل حذف المنطقة من أثر' },
          { status: 502 }
        );
      }
    }

    const deleted = await pointService.delete(params.id, branchId);
    if (!deleted) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
