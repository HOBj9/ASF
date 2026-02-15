import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { AtharService } from '@/lib/services/athar.service';
import Vehicle from '@/models/Vehicle';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, body.branchId ?? searchParams.get('branchId'));

    const point = await pointService.getById(params.id, branchId);
    if (!point) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    const existingZoneId = point.zoneId != null && String(point.zoneId).trim() !== '' ? String(point.zoneId).trim() : null;
    if (existingZoneId) {
      return NextResponse.json(
        { error: 'النقطة مرتبطة بمنطقة أثر مسبقاً' },
        { status: 400 }
      );
    }

    const atharService = await AtharService.forBranch(branchId);
    const pointName = point.nameAr || point.nameEn || point.name || 'نقطة';
    const radius = point.radiusMeters ?? 500;

    const zoneId = await atharService.ensureZone(
      pointName,
      { lat: Number(point.lat), lng: Number(point.lng) },
      radius
    );

    const updated = await pointService.update(params.id, branchId, { zoneId });
    if (!updated) {
      return NextResponse.json({ error: 'فشل تحديث النقطة' }, { status: 500 });
    }

    const vehicles = await Vehicle.find({
      branchId,
      imei: { $ne: null },
      isActive: true,
    })
      .select('imei name')
      .lean();

    if (vehicles.length > 0) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;
      for (const vehicle of vehicles) {
        if (!vehicle.imei) continue;
        try {
          await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_in', webhookUrl);
          await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_out', webhookUrl);
        } catch (e) {
          console.warn('[create-athar-zone] zone event failed for imei=', vehicle.imei, e);
        }
      }
    }

    return NextResponse.json({ point: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}
