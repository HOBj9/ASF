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

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = await assertBranchAccess(session, searchParams.get('branchId') || '');
    const providerTarget = normalizeProviderTarget(searchParams.get('providerTarget'));

    const coverage = await trackingEventDefinitionService.getCoverage({
      branchId,
      providerTarget,
    });

    return NextResponse.json({ coverage });
  } catch (error: any) {
    return handleApiError(error);
  }
}
