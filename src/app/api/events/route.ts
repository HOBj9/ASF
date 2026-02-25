import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { getBranchTimezone, getRecentBranchEvents } from '@/lib/services/zone-event-feed.service';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.EVENTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50);
    const skip = Math.max(0, Number(searchParams.get('skip') || 0));

    const timezone = await getBranchTimezone(branchId);
    if (!timezone) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const events = await getRecentBranchEvents(branchId, limit, timezone, skip);
    const hasMore = events.length >= limit;
    return NextResponse.json({ events, hasMore });
  } catch (error: any) {
    return handleApiError(error);
  }
}
