/**
 * API Authentication Middleware
 * Centralized authentication and authorization for API routes
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, hasPermission } from '@/lib/permissions';
import { messages } from '@/constants/messages';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import type { SessionRole } from '@/lib/contracts/auth';
import { getOrLoadRolePermissions } from '@/lib/live/role-permission-cache';

export interface ApiContext {
  session: any;
  isAdmin: boolean;
}

export async function requireAuth(): Promise<{ session: any } | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: messages.errors.unauthorized },
      { status: 401 },
    );
  }

  if (session.user?.isActive === false) {
    return NextResponse.json(
      { error: 'تم تعطيل حسابك. يرجى الاتصال بالمسؤول' },
      { status: 403 },
    );
  }

  return { session };
}

export async function requireAdmin(): Promise<ApiContext | NextResponse> {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { session } = authResult;
  const userIsAdmin = isAdmin(session.user.role as any);

  if (!userIsAdmin) {
    return NextResponse.json(
      { error: messages.errors.forbidden },
      { status: 403 },
    );
  }

  return { session, isAdmin: true };
}

export async function requirePermission(
  resource: string,
  action: string,
): Promise<{ session: any; role: any } | NextResponse> {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { session } = authResult;
  const sessionRole = session.user?.role as SessionRole | null;

  if (sessionRole && hasPermission(sessionRole as any, resource, action)) {
    return { session, role: sessionRole };
  }

  await connectDB();
  const roleId = typeof session.user.role === 'string' ? session.user.role : session.user.role?._id;
  const role = roleId
    ? await getOrLoadRolePermissions(String(roleId), () =>
        Role.findById(roleId).populate('permissions').lean(),
      )
    : null;

  if (!role || !hasPermission(role as any, resource, action)) {
    return NextResponse.json(
      { error: messages.errors.forbidden },
      { status: 403 },
    );
  }

  return { session, role };
}

export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error);
  return NextResponse.json(
    { error: error?.message || messages.errors.server },
    { status: Number.isInteger(error?.status) ? error.status : 500 },
  );
}
