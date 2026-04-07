export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isLineSupervisor } from '@/lib/permissions';
import { MobileTrackingService } from '@/lib/services/mobile-tracking.service';
import { verifyMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

const mobileTrackingService = new MobileTrackingService();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authorization = request.headers.get('authorization') || '';
    const bearerToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    let userId: string | null = null;

    if (session?.user?.id) {
      if (!isLineSupervisor(session.user?.role as any)) {
        return mobileErrorResponse(
          'تفعيل تتبع الموبايل متاح لمشرفي الخط فقط',
          'MOBILE_ACTIVATION_ROLE_NOT_ALLOWED',
          403
        );
      }
      userId = String(session.user.id);
    } else if (bearerToken) {
      const payload = verifyMobileAuthToken(bearerToken);
      if (!isLineSupervisor(payload.role as any)) {
        return mobileErrorResponse(
          'تفعيل تتبع الموبايل متاح لمشرفي الخط فقط',
          'MOBILE_ACTIVATION_ROLE_NOT_ALLOWED',
          403
        );
      }
      userId = String(payload.sub);
    }

    if (!userId) {
      return mobileErrorResponse(
        'يجب تسجيل الدخول أولاً',
        'MOBILE_AUTH_REQUIRED',
        401
      );
    }

    const body = await request.json().catch(() => ({}));
    const activation = await mobileTrackingService.activate({
      userId,
      deviceId: body?.deviceId || null,
      deviceName: body?.deviceName || null,
      platform: body?.platform || null,
      appVersion: body?.appVersion || null,
    });

    return NextResponse.json(activation, { status: 201 });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
