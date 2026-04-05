export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';

const mobileTrackingService = new MobileTrackingService();

export async function GET(request: Request) {
  try {
    const authResult = await requireMobileLineSupervisorAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const result = await mobileTrackingService.getStatusForUser(authResult.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
