import { NextResponse } from 'next/server';
import { requireAuth, requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { AtharService } from '@/lib/services/athar.service';
import Vehicle from '@/models/Vehicle';
import Branch from '@/models/Branch';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isOrganizationAdmin } from '@/lib/permissions';

const pointService = new PointService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const providedBranchId = body.branchId ?? searchParams.get('branchId');

    const hasTransferPermission = await (async () => {
      const permResult = await requirePermission(permissionResources.POINTS, permissionActions.TRANSFER_TO_ATHAR);
      if (permResult instanceof NextResponse) return false;
      return true;
    })();

    const isOrgAdminWithBranch =
      isOrganizationAdmin(session?.user?.role) &&
      providedBranchId &&
      typeof providedBranchId === 'string' &&
      providedBranchId.trim() !== '';

    if (!hasTransferPermission && !isOrgAdminWithBranch) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    if (isOrgAdminWithBranch && !hasTransferPermission) {
      const orgId = (session?.user as any)?.organizationId?.toString?.();
      if (orgId) {
        const branch = await Branch.findById(providedBranchId).select('organizationId').lean();
        if (!branch || String(branch.organizationId) !== orgId) {
          return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
        }
      }
    }

    const branchId = resolveBranchId(session, providedBranchId);

    const point = await pointService.getById(params.id, branchId);
    if (!point) {
      return NextResponse.json({ error: 'الحاوية غير موجودة' }, { status: 404 });
    }

    const atharService = await AtharService.forBranch(branchId);
    const pointName = point.nameAr || point.nameEn || point.name || 'نقطة';
    const radius = body.radiusMeters !== undefined && Number(body.radiusMeters) > 0
      ? Number(body.radiusMeters)
      : (point.radiusMeters ?? 500);
    const center = { lat: Number(point.lat), lng: Number(point.lng) };

    const existingZoneId = point.zoneId != null && String(point.zoneId).trim() !== '' ? String(point.zoneId).trim() : null;
    const zoneId = existingZoneId
      ? await atharService.createZone(pointName, center, radius)
      : await atharService.ensureZone(pointName, center, radius);

    if (!zoneId) {
      return NextResponse.json({ error: 'فشل إنشاء المنطقة في أثر' }, { status: 500 });
    }

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
