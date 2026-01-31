import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import { AtharService } from '@/lib/services/athar.service';
import Vehicle from '@/models/Vehicle';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const points = await pointService.getAll(municipalityId);
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
    const municipalityId = resolveMunicipalityId(session, body.municipalityId);

    const { name, nameAr, nameEn, type, lat, lng, radiusMeters, addressText, isActive } = body;
    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'الاسم والاحداثيات مطلوبة' },
        { status: 400 }
      );
    }

    const pointName = nameAr || nameEn || name;
    const radius = radiusMeters !== undefined ? Number(radiusMeters) : 500;

    const atharService = await AtharService.forMunicipality(municipalityId);
    const zoneId = await atharService.ensureZone(
      pointName,
      { lat: Number(lat), lng: Number(lng) },
      radius
    );

    const point = await pointService.create({
      municipalityId,
      name,
      nameAr,
      nameEn,
      type,
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: radius,
      zoneId,
      addressText,
      isActive: isActive ?? true,
    });

    const vehicles = await Vehicle.find({
      municipalityId,
      imei: { $ne: null },
      isActive: true,
    })
      .select('imei name')
      .lean();

    if (vehicles.length > 0) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/athar/webhook`;
      for (const vehicle of vehicles) {
        if (!vehicle.imei) continue;
        await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_in', webhookUrl);
        await atharService.createZoneEvent(pointName, zoneId, vehicle.imei, 'zone_out', webhookUrl);
      }
    }

    return NextResponse.json({ point }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
