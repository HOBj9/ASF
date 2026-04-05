export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { assertBranchAccess } from '@/lib/utils/municipality.util';
import { trackingEventDefinitionService } from '@/lib/services/tracking-event-definition.service';
import type { TrackingEventType } from '@/models/TrackingEventDefinition';

function normalizeProviderTarget(value: unknown): 'athar' | 'mobile_app' | undefined {
  return value === 'mobile_app' || value === 'athar' ? value : undefined;
}

function normalizeEventTypes(value: unknown): TrackingEventType[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const output = value.filter((item): item is TrackingEventType => item === 'zone_in' || item === 'zone_out');
  return output.length > 0 ? output : undefined;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = await assertBranchAccess(session, searchParams.get('branchId') || '');
    const providerTarget = normalizeProviderTarget(searchParams.get('providerTarget'));
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const pointId = searchParams.get('pointId') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive =
      isActiveParam == null ? undefined : isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const definitions = await trackingEventDefinitionService.listDefinitions({
      branchId,
      providerTarget,
      vehicleId,
      pointId,
      isActive,
    });

    return NextResponse.json({ definitions });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = await assertBranchAccess(session, body.branchId || '');
    const providerTarget = normalizeProviderTarget(body.providerTarget);

    if (!providerTarget) {
      return NextResponse.json({ error: 'يرجى تحديد مزود صحيح' }, { status: 400 });
    }

    const result = await trackingEventDefinitionService.bulkUpsertDefinitions({
      branchId,
      providerTarget,
      vehicleIds: Array.isArray(body.vehicleIds) ? body.vehicleIds : [],
      pointIds: Array.isArray(body.pointIds) ? body.pointIds : [],
      eventTypes: normalizeEventTypes(body.eventTypes),
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      actorUserId: session.user?.id || null,
      actorScope: session.user?.branchId ? 'branch' : 'organization',
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
