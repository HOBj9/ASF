export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { VehicleTrackHistoryService } from '@/lib/services/vehicle-track-history.service';

const vehicleTrackHistoryService = new VehicleTrackHistoryService();

function parseRequiredDate(value: string | null, fieldName: string): Date {
  if (!value) {
    throw new Error(`${fieldName} مطلوب`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} غير صالح`);
  }
  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const from = parseRequiredDate(searchParams.get('from'), 'from');
    const to = parseRequiredDate(searchParams.get('to'), 'to');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const { id } = await params;

    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ error: 'الفترة الزمنية غير صحيحة' }, { status: 400 });
    }

    const history = await vehicleTrackHistoryService.getVehicleHistory({
      branchId,
      vehicleId: id,
      from,
      to,
      limit,
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    return handleApiError(error);
  }
}
