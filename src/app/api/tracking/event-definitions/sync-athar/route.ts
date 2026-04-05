export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError, requirePermission } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { assertBranchAccess } from '@/lib/utils/municipality.util';
import { trackingEventDefinitionService } from '@/lib/services/tracking-event-definition.service';

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const branchId = await assertBranchAccess(session, body.branchId || '');

    const result = await trackingEventDefinitionService.syncAtharDefinitions({
      branchId,
      definitionIds: Array.isArray(body.definitionIds) ? body.definitionIds : undefined,
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    return handleApiError(error);
  }
}
