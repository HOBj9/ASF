export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';
import { handleMobileApiError } from '@/lib/utils/mobile-api-error.util';

const mobileTrackingService = new MobileTrackingService();

export async function POST(request: Request) {
  try {
    const authResult = await requireMobileLineSupervisorAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json().catch(() => ({}));
    const result = await mobileTrackingService.deactivateForUser(
      authResult.user.id,
      body?.deviceId || null
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleMobileApiError(error);
  }
}
