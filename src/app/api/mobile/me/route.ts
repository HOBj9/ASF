export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { MobileLineSupervisorService } from '@/lib/services/mobile-line-supervisor.service';
import { handleMobileApiError } from '@/lib/utils/mobile-api-error.util';

const mobileLineSupervisorService = new MobileLineSupervisorService();

export async function GET(request: Request) {
  try {
    const authResult = await requireMobileLineSupervisorAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const profile = await mobileLineSupervisorService.getProfile(authResult.user.id);
    return NextResponse.json(profile);
  } catch (error) {
    return handleMobileApiError(error);
  }
}
