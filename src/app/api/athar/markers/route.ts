export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { AtharService } from '@/lib/services/athar.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

/**
 * GET /api/athar/markers
 * Fetches markers from Athar (USER_GET_MARKERS) using the branch's atharKey.
 * Query: branchId (optional for admin).
 */
export async function GET(request: Request) {
  try {
    console.log('[Athar API] GET /api/athar/markers');
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    console.log('[Athar API] GET /api/athar/markers branchId=', branchId);

    const atharService = await AtharService.forBranch(branchId);
    const markers = await atharService.getMarkers();
    console.log('[Athar API] GET /api/athar/markers count=', markers.length);

    return NextResponse.json({ markers });
  } catch (error: any) {
    console.log('[Athar API] GET /api/athar/markers error=', error?.message);
    return handleApiError(error);
  }
}
