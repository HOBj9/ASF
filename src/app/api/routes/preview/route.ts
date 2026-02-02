import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import connectDB from '@/lib/mongodb';
import Point from '@/models/Point';

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const pointIds: string[] = Array.isArray(body.pointIds) ? body.pointIds : [];
    if (pointIds.length < 2) {
      return NextResponse.json({ error: 'يجب اختيار نقطتين على الأقل' }, { status: 400 });
    }

    await connectDB();

    const pointDocs = await Point.find({
      _id: { $in: pointIds },
      branchId,
    })
      .select('name nameAr lat lng')
      .lean();

    const pointMap = new Map(pointDocs.map((p: any) => [String(p._id), p]));
    const orderedPoints = pointIds
      .map((id) => pointMap.get(String(id)))
      .filter(Boolean);

    if (orderedPoints.length !== pointIds.length) {
      return NextResponse.json({ error: 'يوجد نقاط غير تابعة للفرع' }, { status: 400 });
    }

    const coords = orderedPoints.map((p: any) => [Number(p.lng), Number(p.lat)]);
    const fallbackGeometry = {
      type: 'LineString',
      coordinates: coords,
    };

    let geometry = fallbackGeometry;
    let source: 'osrm' | 'fallback' = 'fallback';

    const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
    const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(';');
    const url = `${baseUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const osrmGeometry = data?.routes?.[0]?.geometry;
        if (osrmGeometry?.type === 'LineString' && Array.isArray(osrmGeometry.coordinates)) {
          geometry = osrmGeometry;
          source = 'osrm';
        }
      }
    } catch {
      // fall back to straight line preview
    }

    return NextResponse.json({
      geometry,
      source,
      points: orderedPoints.map((p: any) => ({
        _id: String(p._id),
        name: p.name,
        nameAr: p.nameAr,
        lat: Number(p.lat),
        lng: Number(p.lng),
      })),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

