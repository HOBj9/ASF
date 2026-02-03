import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { AtharService } from '@/lib/services/athar.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

export const dynamic = 'force-dynamic';

type AtharObjectView = {
  id: string;
  imei: string;
  name: string;
  plateNumber: string | null;
  lat: number | null;
  lng: number | null;
  speed: number;
  angle: number;
  active: boolean;
  dtTracker: string | null;
  dtServer: string | null;
  model: string | null;
  device: string | null;
  raw: Record<string, any>;
};

function normalizeObject(obj: Record<string, any>, index: number): AtharObjectView {
  const latNum = Number(obj.lat ?? obj.latitude);
  const lngNum = Number(obj.lng ?? obj.longitude);
  const speedNum = Number(obj.speed ?? obj.params?.speed ?? 0);
  const angleNum = Number(obj.angle ?? obj.course ?? obj.params?.angle ?? obj.params?.course ?? 0);

  return {
    id: String(obj.id ?? obj.object_id ?? obj.objectId ?? obj.imei ?? index),
    imei: String(obj.imei ?? ''),
    name: String(obj.name ?? obj.object_name ?? `Object ${index + 1}`),
    plateNumber: obj.plate_number ? String(obj.plate_number) : null,
    lat: Number.isFinite(latNum) ? latNum : null,
    lng: Number.isFinite(lngNum) ? lngNum : null,
    speed: Number.isFinite(speedNum) ? speedNum : 0,
    angle: Number.isFinite(angleNum) ? angleNum : 0,
    active: String(obj.active ?? '').toLowerCase() === 'true' || String(obj.loc_valid ?? '') === '1',
    dtTracker: obj.dt_tracker ? String(obj.dt_tracker) : null,
    dtServer: obj.dt_server ? String(obj.dt_server) : null,
    model: obj.model ? String(obj.model) : null,
    device: obj.device ? String(obj.device) : null,
    raw: obj,
  };
}

/**
 * GET /api/athar/objects
 * Fetch all vehicles/objects visible in Athar account for this branch key.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const atharService = await AtharService.forBranch(branchId);
    const objectsRaw = await atharService.getObjects();
    const objects = objectsRaw.map((obj, index) => normalizeObject(obj as Record<string, any>, index));

    return NextResponse.json({ objects });
  } catch (error: any) {
    return handleApiError(error);
  }
}
