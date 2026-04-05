export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';

const mobileTrackingService = new MobileTrackingService();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const authorization = request.headers.get('authorization') || '';
    const hasBearerToken = authorization.startsWith('Bearer ');
    const trackingToken = request.headers.get('x-tracking-token') || '';
    const hasSessionCookie = Boolean(request.headers.get('cookie'));

    let result;

    if (hasBearerToken) {
      const auth = await requireMobileLineSupervisorAuth(request);
      if (auth instanceof NextResponse) {
        return auth;
      }

      result = await mobileTrackingService.ingestForUser(auth.user.id, body);
    } else if (trackingToken) {
      result = await mobileTrackingService.ingestByToken(trackingToken, body);
    } else if (hasSessionCookie) {
      const auth = await requireMobileLineSupervisorAuth(request);
      if (auth instanceof NextResponse) {
        return auth;
      }

      result = await mobileTrackingService.ingestForUser(auth.user.id, body);
    } else {
      result = await mobileTrackingService.ingestByToken(trackingToken, body);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
