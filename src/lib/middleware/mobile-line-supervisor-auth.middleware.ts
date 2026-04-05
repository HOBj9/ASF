import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import { isLineSupervisor } from '@/lib/permissions';
import { verifyMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';

export interface MobileLineSupervisorUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
  branchId: string | null;
  trackingVehicleId: string | null;
  isActive: boolean;
}

export interface MobileLineSupervisorAuthContext {
  user: MobileLineSupervisorUser;
  authSource: 'bearer' | 'session';
}

function normalizeRoleName(role: any): string {
  if (typeof role === 'string') return role;
  if (role && typeof role.name === 'string') return role.name;
  return '';
}

function normalizeUser(document: any): MobileLineSupervisorUser {
  return {
    id: String(document._id),
    name: String(document.name || ''),
    email: String(document.email || ''),
    role: normalizeRoleName(document.role),
    organizationId: document.organizationId ? String(document.organizationId) : null,
    branchId: document.branchId ? String(document.branchId) : null,
    trackingVehicleId: document.trackingVehicleId ? String(document.trackingVehicleId) : null,
    isActive: document.isActive !== false,
  };
}

async function loadLineSupervisorUser(userId: string): Promise<MobileLineSupervisorUser | null> {
  await connectDB();

  const user = await User.findById(userId)
    .populate({ path: 'role', select: 'name permissions' })
    .select('name email role organizationId branchId trackingVehicleId isActive')
    .lean();

  if (!user || user.isActive === false) {
    return null;
  }

  if (!isLineSupervisor(user.role as any)) {
    return null;
  }

  return normalizeUser(user);
}

export async function requireMobileLineSupervisorAuth(
  request: Request
): Promise<MobileLineSupervisorAuthContext | NextResponse> {
  try {
    const authorization = request.headers.get('authorization') || '';
    const bearerToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (bearerToken) {
      const payload = verifyMobileAuthToken(bearerToken);
      if (!isLineSupervisor(payload.role as any)) {
        return NextResponse.json(
          { error: 'Mobile APIs are available only for line supervisors' },
          { status: 403 }
        );
      }

      const user = await loadLineSupervisorUser(String(payload.sub));
      if (!user) {
        return NextResponse.json(
          { error: 'User account is disabled or no longer eligible' },
          { status: 403 }
        );
      }

      return {
        user,
        authSource: 'bearer',
      };
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must login first' }, { status: 401 });
    }

    if (!isLineSupervisor(session.user.role as any)) {
      return NextResponse.json(
        { error: 'Mobile APIs are available only for line supervisors' },
        { status: 403 }
      );
    }

    const user = await loadLineSupervisorUser(String(session.user.id));
    if (!user) {
      return NextResponse.json(
        { error: 'User account is disabled or no longer eligible' },
        { status: 403 }
      );
    }

    return {
      user,
      authSource: 'session',
    };
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Authentication failed' },
      { status: Number.isInteger(error?.status) ? error.status : 401 }
    );
  }
}
