export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import connectDB from '@/lib/mongodb';
import Point from '@/models/Point';

/**
 * POST /api/routes/optimal-order
 * Body: { branchId?, pointIds: string[], startPointId?, endPointId? }
 * Returns: { orderedPointIds, geometry, distanceKm, points }
 * Uses OSRM Table for distance matrix, greedy TSP with fixed start/end, then OSRM Route for geometry.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const pointIds: string[] = Array.isArray(body.pointIds) ? body.pointIds : [];
    let startPointId: string | null = body.startPointId ?? null;
    let endPointId: string | null = body.endPointId ?? null;

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
    const orderedById = pointIds.map((id) => pointMap.get(String(id))).filter(Boolean);
    if (orderedById.length !== pointIds.length) {
      return NextResponse.json({ error: 'توجد نقاط غير تابعة للفرع' }, { status: 400 });
    }

    if (!startPointId || !pointMap.has(String(startPointId))) startPointId = pointIds[0];
    if (!endPointId || !pointMap.has(String(endPointId))) endPointId = pointIds[pointIds.length - 1];
    if (startPointId === endPointId && pointIds.length > 1) {
      endPointId = pointIds[pointIds.length - 1] === startPointId ? pointIds[0] : pointIds[pointIds.length - 1];
    }

    const idsInOrder = pointIds.slice();
    const startIdx = idsInOrder.indexOf(startPointId);
    const endIdx = idsInOrder.indexOf(endPointId);
    if (startIdx >= 0) idsInOrder.splice(startIdx, 1);
    if (endIdx >= 0 && endPointId !== startPointId) {
      const effectiveEndIdx = idsInOrder.indexOf(endPointId);
      if (effectiveEndIdx >= 0) idsInOrder.splice(effectiveEndIdx, 1);
    }
    const middleIds = idsInOrder.filter((id) => id !== startPointId && id !== endPointId);

    const allIds = [startPointId, ...middleIds, endPointId];
    const coords = allIds.map((id) => {
      const point = pointMap.get(String(id)) as any;
      return [Number(point.lng), Number(point.lat)] as [number, number];
    });

    if (middleIds.length > 0) {
      const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
      const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(';');
      const tableUrl = `${baseUrl}/table/v1/driving/${coordString}?annotations=distance`;

      try {
        const tableRes = await fetch(tableUrl);
        if (tableRes.ok) {
          const tableData = await tableRes.json();
          const distances = tableData.distances as number[][] | undefined;
          if (distances && distances.length === coords.length) {
            const totalPoints = coords.length;
            const start = 0;
            const end = totalPoints - 1;
            const middleIndices = Array.from({ length: totalPoints - 2 }, (_, i) => i + 1);
            let bestOrder: number[] = [start, ...middleIndices, end];
            let bestDist = Infinity;

            const sumOrder = (order: number[]) => {
              let distance = 0;
              for (let i = 0; i < order.length - 1; i++) {
                const from = order[i];
                const to = order[i + 1];
                const value = distances[from]?.[to];
                if (value != null && Number.isFinite(value)) distance += value;
                else distance += 1e9;
              }
              return distance;
            };

            bestDist = sumOrder(bestOrder);

            const permute = (arr: number[], from: number, cb: (order: number[]) => void) => {
              if (from === arr.length) {
                cb([start, ...arr, end]);
                return;
              }
              for (let i = from; i < arr.length; i++) {
                [arr[from], arr[i]] = [arr[i], arr[from]];
                permute(arr, from + 1, cb);
                [arr[from], arr[i]] = [arr[i], arr[from]];
              }
            };

            if (middleIndices.length <= 8) {
              permute(middleIndices, 0, (order) => {
                const distance = sumOrder(order);
                if (distance < bestDist) {
                  bestDist = distance;
                  bestOrder = order;
                }
              });
            } else {
              const used = new Set<number>([start]);
              const order = [start];
              let current = start;

              while (order.length < totalPoints - 1) {
                let next = -1;
                let minDistance = Infinity;
                for (let j = 0; j < totalPoints; j++) {
                  if (used.has(j) || j === end) continue;
                  const value = distances[current]?.[j];
                  if (value != null && value < minDistance) {
                    minDistance = value;
                    next = j;
                  }
                }
                if (next >= 0) {
                  order.push(next);
                  used.add(next);
                  current = next;
                } else {
                  break;
                }
              }

              order.push(end);
              const distance = sumOrder(order);
              if (distance < bestDist) bestOrder = order;
            }

            const newOrder = bestOrder.map((i) => allIds[i]);
            allIds.length = 0;
            allIds.push(...newOrder);
          }
        }
      } catch {
        // Keep initial order when the matrix service is unavailable.
      }
    }

    const orderedPoints = allIds.map((id) => pointMap.get(String(id))).filter(Boolean) as any[];
    const finalCoords = orderedPoints.map((p: any) => [Number(p.lng), Number(p.lat)]);

    let geometry: { type: 'LineString'; coordinates: number[][] } = {
      type: 'LineString',
      coordinates: finalCoords,
    };
    let distanceKm: number | null = null;

    const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
    const coordString = finalCoords.map((c: number[]) => `${c[0]},${c[1]}`).join(';');
    const routeUrl = `${baseUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    try {
      const routeRes = await fetch(routeUrl);
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        const route = routeData?.routes?.[0];
        if (route?.geometry?.type === 'LineString' && Array.isArray(route.geometry.coordinates)) {
          geometry = route.geometry;
        }
        if (route?.distance != null && Number.isFinite(route.distance)) {
          distanceKm = Number(route.distance) / 1000;
        }
      }
    } catch {
      // Use the straight-line geometry if OSRM routing fails.
    }

    if (distanceKm == null && finalCoords.length >= 2) {
      let distanceMeters = 0;
      for (let i = 0; i < finalCoords.length - 1; i++) {
        const [lng1, lat1] = finalCoords[i];
        const [lng2, lat2] = finalCoords[i + 1];
        const earthRadius = 6371e3;
        const latRad1 = (lat1 * Math.PI) / 180;
        const latRad2 = (lat2 * Math.PI) / 180;
        const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(deltaLat / 2) ** 2 +
          Math.cos(latRad1) * Math.cos(latRad2) * Math.sin(deltaLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters += earthRadius * c;
      }
      distanceKm = distanceMeters / 1000;
    }

    return NextResponse.json({
      orderedPointIds: allIds,
      geometry,
      distanceKm: distanceKm ?? 0,
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
