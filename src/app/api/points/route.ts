export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { AtharService } from '@/lib/services/athar.service';
import Vehicle from '@/models/Vehicle';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { cloneBranchMaterialTreeToPoint } from '@/lib/services/material-tree.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAtharProviderEnabledForBranch } from '@/lib/trackingcore/provider-config';

const pointService = new PointService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const points = await pointService.getAll(branchId);
    return NextResponse.json({ points });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);
    const organizationId = await resolveOrganizationId(session, body.organizationId);

    const { name, nameAr, nameEn, type, lat, lng, radiusMeters, addressText, isActive, primaryClassificationId, secondaryClassificationId, otherIdentifier } = body;
    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'الاسم والإحداثيات مطلوبة' },
        { status: 400 }
      );
    }

    const pointName = nameAr || nameEn || name;
    const radius = radiusMeters !== undefined ? Number(radiusMeters) : 500;

    const atharEnabled = await isAtharProviderEnabledForBranch(branchId);
    let zoneId: string | null = null;
    let atharService: AtharService | null = null;

    if (atharEnabled) {
      console.log('[Athar API] POST /api/points: creating zone via Athar branchId=', branchId, 'name=', pointName);
      atharService = await AtharService.forBranch(branchId);
      zoneId = await atharService.ensureZone(
        pointName,
        { lat: Number(lat), lng: Number(lng) },
        radius
      );
      console.log('[Athar API] POST /api/points: zoneId=', zoneId);
    }

    const point = await pointService.create({
      branchId,
      name,
      nameAr,
      nameEn,
      type,
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: radius,
      zoneId: zoneId || undefined,
      addressText,
      primaryClassificationId: primaryClassificationId || null,
      secondaryClassificationId: secondaryClassificationId || null,
      otherIdentifier: otherIdentifier || null,
      isActive: isActive ?? true,
      createdByUserId: session?.user?.id ?? null,
    });

    const vehicles = atharEnabled
      ? await Vehicle.find({
          branchId,
          trackingProvider: 'athar',
          imei: { $ne: null },
          isActive: true,
        })
          .select('imei name')
          .lean()
      : [];

    if (atharService && zoneId && vehicles.length > 0) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;
      console.log('[Athar API] POST /api/points: creating zone events for', vehicles.length, 'vehicles');
      for (const vehicle of vehicles) {
        if (!vehicle.imei) continue;
        await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_in', webhookUrl);
        await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_out', webhookUrl);
      }
      console.log('[Athar API] POST /api/points: zone events created');
    }

    await cloneBranchMaterialTreeToPoint(organizationId, branchId, point._id.toString());

    return NextResponse.json({ point }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
