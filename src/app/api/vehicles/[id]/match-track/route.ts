export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';

interface MatchPoint {
  lat: number;
  lng: number;
  timestamp?: string | null;
  accuracy?: number | null;
}

interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}

const OSRM_CHUNK_SIZE = 90;
const OSRM_CHUNK_OVERLAP = 5;
const DEFAULT_RADIUS_METERS = 25;

/**
 * Ramer-Douglas-Peucker simplification.
 * Tolerance in degrees — 0.00005 ≈ 5 m, keeps visual quality at typical city zoom levels.
 */
function rdpSimplify(coords: number[][], tolerance: number): number[][] {
  if (coords.length <= 2) return coords;

  const sq = (x: number) => x * x;
  const sqSegDist = (p: number[], a: number[], b: number[]) => {
    let x = a[0], y = a[1];
    let dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (sq(dx) + sq(dy));
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    return sq(p[0] - x) + sq(p[1] - y);
  };

  const sqTol = sq(tolerance);
  const stack: [number, number][] = [[0, coords.length - 1]];
  const keep = new Uint8Array(coords.length);
  keep[0] = 1;
  keep[coords.length - 1] = 1;

  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxSq = 0, idx = first;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(coords[i], coords[first], coords[last]);
      if (d > maxSq) { maxSq = d; idx = i; }
    }
    if (maxSq > sqTol) {
      keep[idx] = 1;
      if (idx - first > 1) stack.push([first, idx]);
      if (last - idx > 1) stack.push([idx, last]);
    }
  }

  return coords.filter((_, i) => keep[i]);
}

// ~5 m tolerance — visually lossless at city zoom, cuts points by 90–95 %
const RDP_TOLERANCE = 0.00005;

async function matchChunk(
  baseUrl: string,
  points: MatchPoint[]
): Promise<GeoJSONLineString | null> {
  const coordString = points.map((p) => `${p.lng},${p.lat}`).join(';');

  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
  });

  const radiuses = points
    .map((p) =>
      p.accuracy != null && Number.isFinite(p.accuracy) && p.accuracy > 0
        ? Math.max(5, Math.round(p.accuracy))
        : DEFAULT_RADIUS_METERS
    )
    .join(';');
  params.set('radiuses', radiuses);

  const timestamps = points
    .map((p) => {
      if (!p.timestamp) return '';
      const ms = new Date(p.timestamp).getTime();
      return Number.isFinite(ms) ? Math.floor(ms / 1000).toString() : '';
    });

  if (timestamps.every((t) => t !== '')) {
    params.set('timestamps', timestamps.join(';'));
  }

  const url = `${baseUrl}/match/v1/driving/${coordString}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data = await response.json();
  if (data?.code !== 'Ok') return null;

  const matchings = data?.matchings;
  if (!Array.isArray(matchings) || matchings.length === 0) return null;

  if (matchings.length === 1) {
    const geo = matchings[0]?.geometry;
    if (geo?.type === 'LineString' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      return geo as GeoJSONLineString;
    }
    return null;
  }

  const allCoords: number[][] = [];
  for (const matching of matchings) {
    const geo = matching?.geometry;
    if (geo?.type === 'LineString' && Array.isArray(geo.coordinates)) {
      allCoords.push(...geo.coordinates);
    }
  }

  if (allCoords.length < 2) return null;
  return { type: 'LineString', coordinates: allCoords };
}

function stitchGeometries(geometries: GeoJSONLineString[]): GeoJSONLineString {
  if (geometries.length === 0) {
    return { type: 'LineString', coordinates: [] };
  }
  if (geometries.length === 1) return geometries[0];

  const allCoords: number[][] = [...geometries[0].coordinates];

  for (let i = 1; i < geometries.length; i++) {
    const nextCoords = geometries[i].coordinates;
    if (nextCoords.length === 0) continue;

    const lastCoord = allCoords[allCoords.length - 1];
    let startIdx = 0;
    if (lastCoord) {
      const [lastLng, lastLat] = lastCoord;
      for (let j = 0; j < Math.min(nextCoords.length, 20); j++) {
        const [cLng, cLat] = nextCoords[j];
        const dist = Math.abs(cLng - lastLng) + Math.abs(cLat - lastLat);
        if (dist < 0.0001) {
          startIdx = j + 1;
          break;
        }
      }
    }

    for (let j = startIdx; j < nextCoords.length; j++) {
      allCoords.push(nextCoords[j]);
    }
  }

  return { type: 'LineString', coordinates: allCoords };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    await params;

    const body = await request.json();
    const points: MatchPoint[] = Array.isArray(body?.points) ? body.points : [];

    if (points.length < 2) {
      return NextResponse.json(
        { error: 'يجب توفير نقطتين على الأقل', source: 'error' },
        { status: 400 }
      );
    }

    const validPoints = points.filter(
      (p) =>
        typeof p.lat === 'number' &&
        typeof p.lng === 'number' &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng)
    );

    if (validPoints.length < 2) {
      return NextResponse.json(
        { error: 'الإحداثيات غير صالحة', source: 'error' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

    if (validPoints.length <= OSRM_CHUNK_SIZE) {
      const geometry = await matchChunk(baseUrl, validPoints);
      if (geometry && geometry.coordinates.length >= 2) {
        geometry.coordinates = rdpSimplify(geometry.coordinates, RDP_TOLERANCE);
        return NextResponse.json({ geometry, source: 'osrm', confidence: 1 });
      }

      return NextResponse.json({
        geometry: {
          type: 'LineString',
          coordinates: rdpSimplify(validPoints.map((p) => [p.lng, p.lat]), RDP_TOLERANCE),
        },
        source: 'fallback',
        confidence: 0,
      });
    }

    const chunks: MatchPoint[][] = [];
    let i = 0;
    while (i < validPoints.length) {
      const end = Math.min(i + OSRM_CHUNK_SIZE, validPoints.length);
      chunks.push(validPoints.slice(i, end));
      if (end >= validPoints.length) break;
      i = end - OSRM_CHUNK_OVERLAP;
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) => matchChunk(baseUrl, chunk).catch(() => null))
    );

    const successfulGeometries = chunkResults.filter(
      (g): g is GeoJSONLineString => g !== null && g.coordinates.length >= 2
    );

    if (successfulGeometries.length === 0) {
      return NextResponse.json({
        geometry: {
          type: 'LineString',
          coordinates: rdpSimplify(validPoints.map((p) => [p.lng, p.lat]), RDP_TOLERANCE),
        },
        source: 'fallback',
        confidence: 0,
      });
    }

    const stitched = stitchGeometries(successfulGeometries);
    stitched.coordinates = rdpSimplify(stitched.coordinates, RDP_TOLERANCE);
    const confidence = successfulGeometries.length / chunks.length;

    return NextResponse.json({
      geometry: stitched,
      source: 'osrm',
      confidence: Math.round(confidence * 100) / 100,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
