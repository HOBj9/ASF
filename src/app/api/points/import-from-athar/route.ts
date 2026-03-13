export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const markers = body.markers;
    if (!Array.isArray(markers) || markers.length === 0) {
      return NextResponse.json(
        { error: 'يجب إرسال مصفوفة markers غير فارغة' },
        { status: 400 }
      );
    }

    const validMarkers = markers.filter(
      (m: any) =>
        m != null &&
        typeof m === 'object' &&
        m.id != null &&
        m.id !== '' &&
        Number.isFinite(Number(m.lat)) &&
        Number.isFinite(Number(m.lng))
    );

    if (validMarkers.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد علامات صالحة (id, lat, lng مطلوبة)' },
        { status: 400 }
      );
    }

    const normalized = validMarkers.map((m: any) => ({
      id: String(m.id),
      lat: Number(m.lat),
      lng: Number(m.lng),
      name: typeof m.name === 'string' ? m.name.trim() : undefined,
    }));

    const result = await pointService.importFromAtharMarkers(branchId, normalized);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
