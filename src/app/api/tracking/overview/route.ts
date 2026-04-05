export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { TrackingMonitorService } from '@/lib/services/tracking-monitor.service';

const trackingMonitorService = new TrackingMonitorService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    const data = await trackingMonitorService.getOverview(session, {
      branchId: searchParams.get('branchId'),
      organizationId: searchParams.get('organizationId'),
      bindingsLimit: searchParams.get('bindingsLimit')
        ? Number(searchParams.get('bindingsLimit'))
        : undefined,
      messagesLimit: searchParams.get('messagesLimit')
        ? Number(searchParams.get('messagesLimit'))
        : undefined,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

