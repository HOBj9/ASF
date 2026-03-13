import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { AtharService } from '@/lib/services/athar.service';
import Point from '@/models/Point';
import Branch from '@/models/Branch';
import Vehicle from '@/models/Vehicle';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';

const pointService = new PointService();

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return;
  const sessionOrg = session?.user?.organizationId?.toString?.();
  if (sessionOrg === organizationId) return;
  const branchId = session?.user?.branchId?.toString?.();
  if (branchId) {
    await connectDB();
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch && String(branch.organizationId) === organizationId) return;
  }
  throw new Error('لا يمكنك الوصول إلى هذه المؤسسة');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.TRANSFER_TO_ATHAR);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const pointIds = body.pointIds ?? body.point_ids;
    const transferSelected = Array.isArray(pointIds) && pointIds.length > 0;

    const branches = await Branch.find({ organizationId, isActive: true }).lean().exec();
    const branchIds = branches.map((b) => b._id.toString());
    const branchesWithAthar = branches.filter((b) => b.atharKey && String(b.atharKey).trim());
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;

    let pointsToTransfer: { _id: any; branchId: any; name: string; nameAr?: string; nameEn?: string; lat: number; lng: number; radiusMeters: number }[];

    if (transferSelected) {
      const ids = pointIds.map((x: any) => String(x));
      const points = await Point.find({
        _id: { $in: ids },
        branchId: { $in: branchIds },
        $or: [{ zoneId: null }, { zoneId: '' }],
      }).lean().exec();
      pointsToTransfer = points as any;
    } else {
      const allBranchPoints: any[] = [];
      for (const bid of branchIds) {
        const list = await Point.find({
          branchId: bid,
          $or: [{ zoneId: null }, { zoneId: '' }],
        }).lean().exec();
        allBranchPoints.push(...list);
      }
      pointsToTransfer = allBranchPoints;
    }

    const results: { pointId: string; branchId: string; zoneId?: string; error?: string }[] = [];

    for (const point of pointsToTransfer) {
      const branchId = point.branchId?.toString?.();
      if (!branchId) continue;
      const branch = branchesWithAthar.find((b) => b._id.toString() === branchId);
      if (!branch) {
        results.push({ pointId: String(point._id), branchId, error: 'الفرع لا يملك مفتاح أثر' });
        continue;
      }

      try {
        const atharService = await AtharService.forBranch(branchId);
        const pointName = point.nameAr || point.nameEn || point.name || 'نقطة';
        const radius = point.radiusMeters ?? 500;
        const zoneId = await atharService.ensureZone(
          pointName,
          { lat: Number(point.lat), lng: Number(point.lng) },
          radius
        );

        await pointService.update(String(point._id), branchId, { zoneId });

        const vehicles = await Vehicle.find({
          branchId,
          imei: { $ne: null },
          isActive: true,
        })
          .select('imei name')
          .lean();

        for (const vehicle of vehicles) {
          if (!vehicle.imei) continue;
          try {
            await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_in', webhookUrl);
            await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_out', webhookUrl);
          } catch (e) {
            console.warn('[transfer-to-athar] zone event failed', e);
          }
        }

        results.push({ pointId: String(point._id), branchId, zoneId });
      } catch (err: any) {
        results.push({
          pointId: String(point._id),
          branchId,
          error: err?.message || 'فشل النقل',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return handleApiError(error);
  }
}
