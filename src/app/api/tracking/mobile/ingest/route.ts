export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';

const mobileTrackingService = new MobileTrackingService();

export async function POST(request: Request) {
  try {
    const trackingToken = request.headers.get('x-tracking-token') || '';
    const body = await request.json();
    const result = await mobileTrackingService.ingestByToken(trackingToken, body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
