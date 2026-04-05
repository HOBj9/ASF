export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { assertBranchAccess } from '@/lib/utils/municipality.util';
import { trackingEventDefinitionService } from '@/lib/services/tracking-event-definition.service';
import type { ZoneEventProvider } from '@/lib/tracking/types';

function normalizeProviderTarget(value: unknown): ZoneEventProvider | undefined {
  return value === 'mobile_app' || value === 'athar' ? value : undefined;
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = await assertBranchAccess(session, body.branchId || '');

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive is required' }, { status: 400 });
    }

    const result = await trackingEventDefinitionService.setDefinitionsState({
      branchId,
      isActive: body.isActive,
      definitionIds: Array.isArray(body.definitionIds) ? body.definitionIds : undefined,
      providerTarget: normalizeProviderTarget(body.providerTarget),
      vehicleId: typeof body.vehicleId === 'string' ? body.vehicleId : undefined,
      pointId: typeof body.pointId === 'string' ? body.pointId : undefined,
      actorUserId: session.user?.id || null,
      actorScope: session.user?.branchId ? 'branch' : 'organization',
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    return handleApiError(error);
  }
}
