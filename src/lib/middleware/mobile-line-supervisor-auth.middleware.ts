import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import { isLineSupervisor } from '@/lib/permissions';
import { verifyMobileAuthToken } from '@/lib/trackingcore/mobile-auth-token';
import {
  createMobileApiError,
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

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
        return mobileErrorResponse(
          'واجهات الموبايل متاحة لمشرفي الخط فقط',
          'MOBILE_ROLE_NOT_ALLOWED',
          403
        );
      }

      const user = await loadLineSupervisorUser(String(payload.sub));
      if (!user) {
        return mobileErrorResponse(
          'حساب مشرف الخط معطل أو لم يعد مؤهلاً للوصول',
          'MOBILE_USER_NOT_ELIGIBLE',
          403
        );
      }

      return {
        user,
        authSource: 'bearer',
      };
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return mobileErrorResponse(
        'يجب تسجيل الدخول أولاً',
        'MOBILE_AUTH_REQUIRED',
        401
      );
    }

    if (!isLineSupervisor(session.user.role as any)) {
      return mobileErrorResponse(
        'واجهات الموبايل متاحة لمشرفي الخط فقط',
        'MOBILE_ROLE_NOT_ALLOWED',
        403
      );
    }

    const user = await loadLineSupervisorUser(String(session.user.id));
    if (!user) {
      return mobileErrorResponse(
        'حساب مشرف الخط معطل أو لم يعد مؤهلاً للوصول',
        'MOBILE_USER_NOT_ELIGIBLE',
        403
      );
    }

    return {
      user,
      authSource: 'session',
    };
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Invalid or expired mobile auth token') {
      return mobileErrorResponse(
        'رمز دخول الموبايل غير صالح أو منتهي الصلاحية',
        'MOBILE_AUTH_TOKEN_INVALID',
        401
      );
    }

    if (!(error instanceof Error) || !('code' in error)) {
      error = createMobileApiError(
        'فشل التحقق من هوية المستخدم',
        'MOBILE_AUTH_FAILED',
        Number.isInteger(error?.status) ? error.status : 401
      );
    }

    return handleMobileApiError(error);
  }
}
