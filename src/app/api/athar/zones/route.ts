export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { AtharService } from '@/lib/services/athar.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const pointService = new PointService();

type NormalizedZone = {
  id: string;
  name: string;
  color?: string;
  center: { lat: number; lng: number } | null;
  vertices: Array<{ lat: number; lng: number }>;
};

function parseZoneVertices(zoneVertices?: string): Array<{ lat: number; lng: number }> {
  if (!zoneVertices || typeof zoneVertices !== 'string') return [];
  const parts = zoneVertices
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
  const vertices: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    vertices.push({ lat: parts[i], lng: parts[i + 1] });
  }
  return vertices;
}

function normalizeZones(rawZones: Array<Record<string, any>>): NormalizedZone[] {
  return rawZones.reduce<NormalizedZone[]>((acc, z) => {
      const idRaw = z.zone_id ?? z.id ?? z._id;
      if (idRaw == null || idRaw === '') return acc;
      const id = String(idRaw);
      const name = String(z.name ?? z.title ?? `Zone ${id}`);
      const color = typeof z.color === 'string' && z.color.trim() ? z.color.trim() : undefined;
      const center = PointService.zoneToCenter(z);
      const vertices = parseZoneVertices(z.zone_vertices ?? z.zoneVertices ?? z.vertices);
      acc.push({ id, name, color, center, vertices });
      return acc;
    }, []);
}

/**
 * GET /api/athar/zones
 * Fetches zones from Athar using the branch's atharKey and syncs them to local points.
 * Query: branchId (optional for admin).
 */
export async function GET(request: Request) {
  try {
    console.log('[Athar API] GET /api/athar/zones');
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const shouldSync = searchParams.get('sync') !== 'false';
    console.log('[Athar API] GET /api/athar/zones branchId=', branchId);

    const atharService = await AtharService.forBranch(branchId);
    const zones = await atharService.getZones();
    console.log('[Athar API] GET /api/athar/zones zones count=', zones.length);

    if (shouldSync && zones.length > 0) {
      await pointService.syncFromAtharZones(branchId, zones);
      console.log('[Athar API] GET /api/athar/zones syncFromAtharZones done');
    }

    const points = await pointService.getAll(branchId);
    const normalizedZones = normalizeZones(zones as Array<Record<string, any>>);
    console.log('[Athar API] GET /api/athar/zones returning points count=', points.length);
    return NextResponse.json({ points, zones: normalizedZones, synced: zones.length });
  } catch (error: any) {
    console.log('[Athar API] GET /api/athar/zones error=', error?.message);
    return handleApiError(error);
  }
}
