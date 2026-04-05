export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { AuthService } from '@/lib/services/auth.service';
import { isLineSupervisor } from '@/lib/permissions';
import { createMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';

const authService = new AuthService();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user: any;
    try {
      user = await authService.validateCredentials(email, password);
    } catch (error: any) {
      const message = error?.message || 'Unable to login';
      const status = 403;
      return NextResponse.json({ error: message }, { status });
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!isLineSupervisor(user.role as any)) {
      return NextResponse.json(
        { error: 'Mobile tracking login is available only for line supervisors' },
        { status: 403 }
      );
    }

    const roleName =
      typeof user.role === 'string'
        ? user.role
        : typeof user.role?.name === 'string'
          ? user.role.name
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
  } catch (error: any) {
    return handleApiError(error);
  }
}

