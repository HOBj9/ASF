import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import { isLineSupervisor } from '@/lib/permissions';
import { createMobileApiError } from '@/lib/utils/mobile-api-error.util';

function resolveRoleName(role: unknown): string {
  if (typeof role === 'string') return role;
  if (role && typeof role === 'object' && 'name' in role && typeof (role as { name?: unknown }).name === 'string') {
    return (role as { name: string }).name;
  }

  return '';
}

export class MobileLineSupervisorService {
  async getProfile(userId: string) {
    await connectDB();

    const user = await User.findById(userId)
      .populate({ path: 'role', select: 'name' })
      .select('name email role organizationId branchId trackingVehicleId isActive')
      .lean();

    if (!user || user.isActive === false) {
      throw createMobileApiError(
        'حساب مشرف الخط معطل أو لم يعد مؤهلاً للوصول',
        'MOBILE_USER_NOT_ELIGIBLE',
        403
      );
    }

    if (!isLineSupervisor(user.role as any)) {
      throw createMobileApiError(
        'هذه الواجهة متاحة لمشرف الخط فقط',
        'MOBILE_ROLE_NOT_ALLOWED',
        403
      );
    }

    const organizationId = user.organizationId ? String(user.organizationId) : null;
    const branchId = user.branchId ? String(user.branchId) : null;
    const trackingVehicleId = user.trackingVehicleId ? String(user.trackingVehicleId) : null;

    const [organization, branch, vehicle] = await Promise.all([
      organizationId
        ? Organization.findById(organizationId).select('name slug').lean()
        : null,
      branchId
        ? Branch.findById(branchId).select('name nameAr branchTypeLabel').lean()
        : null,
      branchId && trackingVehicleId
        ? Vehicle.findOne({ _id: trackingVehicleId, branchId })
            .select('name plateNumber trackingProvider acceptedTrackingProviders zoneEventProvider')
            .lean()
        : null,
    ]);

    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: resolveRoleName(user.role) || 'line_supervisor',
        organizationId,
        branchId,
        trackingVehicleId,
        isActive: Boolean(user.isActive),
      },
      organization: organization
        ? {
            id: String(organization._id),
            name: organization.name,
            slug: organization.slug,
          }
        : null,
      branch: branch
        ? {
            id: String(branch._id),
            name: branch.name,
            nameAr: branch.nameAr || null,
            branchTypeLabel: branch.branchTypeLabel || null,
          }
        : null,
      vehicle: vehicle
        ? {
            id: String(vehicle._id),
            name: vehicle.name,
            plateNumber: vehicle.plateNumber || null,
            trackingProvider: vehicle.trackingProvider || 'athar',
            acceptedTrackingProviders: Array.isArray(vehicle.acceptedTrackingProviders)
              ? vehicle.acceptedTrackingProviders
              : [],
            zoneEventProvider: vehicle.zoneEventProvider || null,
          }
        : null,
    };
  }
}
