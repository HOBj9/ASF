export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { VehicleService } from '@/lib/services/vehicle.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import type { TrackingProvider, ZoneEventProvider } from '@/lib/tracking/types';

const vehicleService = new VehicleService();

function normalizeTrackingProvider(value: unknown): TrackingProvider | undefined {
  return value === 'mobile_app' || value === 'traccar' || value === 'athar' ? value : undefined;
}

function normalizeAcceptedTrackingProviders(value: unknown): TrackingProvider[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.filter(
    (item): item is TrackingProvider => item === 'athar' || item === 'mobile_app' || item === 'traccar'
  );
  return normalized.length > 0 ? Array.from(new Set(normalized)) : [];
}

function normalizeZoneEventProvider(value: unknown): ZoneEventProvider | null | undefined {
  if (value === null) return null;
  return value === 'athar' || value === 'mobile_app' ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const vehicles = await vehicleService.getAll(branchId);
    return NextResponse.json({ vehicles });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const {
      name,
      plateNumber,
      imei,
      trackingProvider,
      acceptedTrackingProviders,
      zoneEventProvider,
      fuelType,
      fuelPricePerKm,
      atharObjectId,
      driverId,
      routeId,
      isActive,
    } = body;
    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const normalizedTrackingProvider = normalizeTrackingProvider(trackingProvider);
    const normalizedAcceptedProviders = normalizeAcceptedTrackingProviders(acceptedTrackingProviders);
    const normalizedZoneEventProvider = normalizeZoneEventProvider(zoneEventProvider);

    if (
      (normalizedAcceptedProviders?.includes('athar') || normalizedTrackingProvider === 'athar') &&
      !String(imei || '').trim()
    ) {
      return NextResponse.json(
        { error: 'رقم IMEI مطلوب للمركبات التي تستقبل تتبعاً من أثر' },
        { status: 400 }
      );
    }

    const vehicle = await vehicleService.create({
      branchId,
      name,
      plateNumber,
      imei,
      trackingProvider: normalizedTrackingProvider,
      acceptedTrackingProviders: normalizedAcceptedProviders,
      zoneEventProvider: normalizedZoneEventProvider,
      fuelType: fuelType === 'diesel' ? 'diesel' : 'gasoline',
      fuelPricePerKm: fuelPricePerKm != null && fuelPricePerKm !== '' ? Number(fuelPricePerKm) : undefined,
      atharObjectId,
      driverId,
      routeId,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
