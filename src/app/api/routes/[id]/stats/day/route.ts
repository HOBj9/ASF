import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteStatsService } from '@/lib/services/route-stats.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { getWorkDayRangeForDate } from '@/lib/utils/work-day.util';
import connectDB from '@/lib/mongodb';
import Route from '@/models/Route';
import WorkSchedule from '@/models/WorkSchedule';
import Branch from '@/models/Branch';

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

    const dateStr = searchParams.get('date');
    const vehicleId = searchParams.get('vehicleId') || undefined;

    if (!dateStr) {
      return NextResponse.json({ error: 'يجب تحديد التاريخ (date)' }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 });
    }

    const { id } = await params;

    await connectDB();
    const route = await Route.findOne({ _id: id, branchId }).lean().exec();
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    const branch = await Branch.findById(branchId).select('timezone').lean().exec();
    const timezone = (branch as any)?.timezone || 'Asia/Damascus';

    const workScheduleId = (route as any).workScheduleId;
    if (!workScheduleId) {
      return NextResponse.json({
        visits: [],
        visitedPointIds: [],
        orderAnalysis: null,
        message: 'المسار غير مربوط بجدول أيام عمل',
      });
    }

    const workSchedule = await WorkSchedule.findById(workScheduleId).lean().exec();
    if (!workSchedule || !(workSchedule as any).days?.length) {
      return NextResponse.json({
        visits: [],
        visitedPointIds: [],
        orderAnalysis: null,
        message: 'جدول العمل فارغ',
      });
    }

    const range = getWorkDayRangeForDate(
      date,
      workSchedule as { days: Array<{ dayOfWeek: number; startTime: string; endTime: string }> },
      timezone
    );

    if (!range) {
      return NextResponse.json({
        visits: [],
        visitedPointIds: [],
        orderAnalysis: null,
        message: 'التاريخ ليس يوم عمل',
      });
    }

    const vehicleIds = vehicleId ? [vehicleId] : undefined;
    const { visits, visitedPointIds } = await routeStatsService.getVisitedPointsForDay(
      id,
      branchId,
      range,
      vehicleIds
    );

    const orderAnalysis = await routeStatsService.getVisitOrderAnalysis(
      id,
      branchId,
      range,
      vehicleIds
    );

    return NextResponse.json({
      visits,
      visitedPointIds: Array.from(visitedPointIds),
      orderAnalysis,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
