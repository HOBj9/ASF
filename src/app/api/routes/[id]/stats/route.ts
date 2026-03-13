import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteStatsService } from '@/lib/services/route-stats.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';

const routeStatsService = new RouteStatsService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { error: 'يجب تحديد من وإلى تاريخ (from, to)' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'تواريخ غير صالحة' }, { status: 400 });
    }
    if (fromDate > toDate) {
      return NextResponse.json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }, { status: 400 });
    }

    const { id } = await params;
    const result = await routeStatsService.getCompletionStats(id, branchId, fromDate, toDate, {
      vehicleId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
