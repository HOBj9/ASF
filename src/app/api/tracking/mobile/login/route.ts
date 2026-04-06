export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { UserService } from '@/lib/services/user.service';
import { isLineSupervisor } from '@/lib/permissions';
import { createMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';
import type { IRole } from '@/models/Role';

const userService = new UserService();

function resolvedRoleName(role: unknown): string {
  if (!role) return 'unknown';
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role !== null && 'name' in role && typeof (role as { name: unknown }).name === 'string') {
    return (role as { name: string }).name;
  }
  return 'unknown';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    // Trim to avoid copy/paste leading/trailing whitespace breaking bcrypt.compare
    const password = String(body?.password ?? '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', errorAr: 'البريد وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    let user: Awaited<ReturnType<UserService['validateCredentials']>>;
    try {
      user = await userService.validateCredentials(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to login';
      return NextResponse.json(
        { error: message, errorAr: message, code: 'MOBILE_LOGIN_ACCOUNT_DISABLED' },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          errorAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          code: 'MOBILE_LOGIN_INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    if (!isLineSupervisor(user.role as IRole | null)) {
      const roleName = resolvedRoleName(user.role);
      return NextResponse.json(
        {
          error: 'Mobile tracking login is only available for accounts with the line_supervisor role.',
          errorAr:
            'تسجيل دخول تتبع الجوال متاح لمشرفي الخط فقط. أنشئ أو اختر مستخدماً بدور «مشرف خط» من لوحة الإدارة، أو غيّر دور هذا الحساب.',
          code: 'MOBILE_LOGIN_ROLE_NOT_ALLOWED',
          role: roleName,
        },
        { status: 403 }
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
    return handleApiError(error);
  }
}
