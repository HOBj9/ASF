import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const point = await pointService.getById(params.id, municipalityId);
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
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    if ('zoneId' in body) {
      delete body.zoneId;
    }

    const point = await pointService.update(params.id, municipalityId, body);
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
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const deleted = await pointService.delete(params.id, municipalityId);
    if (!deleted) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
