export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { isLineSupervisor } from '@/lib/permissions';
import { createMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';
import type { IRole } from '@/models/Role';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

const userService = new UserService();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    // Trim to avoid copy/paste leading/trailing whitespace breaking bcrypt.compare
    const password = String(body?.password ?? '').trim();

    if (!email || !password) {
      return mobileErrorResponse(
        'البريد الإلكتروني وكلمة المرور مطلوبان',
        'MOBILE_LOGIN_MISSING_CREDENTIALS',
        400
      );
    }

    let user: Awaited<ReturnType<UserService['validateCredentials']>>;
    try {
      user = await userService.validateCredentials(email, password);
    } catch (err: unknown) {
      return mobileErrorResponse(
        'تم تعطيل حسابك. يرجى التواصل مع المسؤول',
        'MOBILE_LOGIN_ACCOUNT_DISABLED',
        403
      );
    }

    if (!user) {
      return mobileErrorResponse(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'MOBILE_LOGIN_INVALID_CREDENTIALS',
        401
      );
    }

    if (!isLineSupervisor(user.role as IRole | null)) {
      return mobileErrorResponse(
        'تسجيل دخول الموبايل متاح لمشرفي الخط فقط',
        'MOBILE_LOGIN_ROLE_NOT_ALLOWED',
        403
      );
    }

    const roleName =
      typeof user.role === 'string'
        ? user.role
        : typeof user.role === 'object' && user.role !== null && 'name' in user.role
          ? String((user.role as { name: string }).name)
          : 'line_supervisor';

    const tokenResult = createMobileAuthToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: roleName,
      organizationId: user.organizationId ? String(user.organizationId) : null,
      branchId: user.branchId ? String(user.branchId) : null,
      trackingVehicleId: user.trackingVehicleId ? String(user.trackingVehicleId) : null,
    });

    return NextResponse.json({
      accessToken: tokenResult.token,
      tokenType: 'Bearer',
      expiresAt: new Date(tokenResult.payload.exp * 1000).toISOString(),
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: roleName,
        organizationId: user.organizationId ? String(user.organizationId) : null,
        branchId: user.branchId ? String(user.branchId) : null,
        trackingVehicleId: user.trackingVehicleId ? String(user.trackingVehicleId) : null,
      },
      tracking: {
        canActivate: Boolean(user.branchId && user.trackingVehicleId),
      },
    });
  } catch (error: unknown) {
    return handleMobileApiError(error);
  }
}
