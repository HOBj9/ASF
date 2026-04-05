export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';

const mobileTrackingService = new MobileTrackingService();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const result = await mobileTrackingService.revokeBinding(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
