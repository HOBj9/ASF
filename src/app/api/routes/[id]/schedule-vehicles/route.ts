export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import connectDB from '@/lib/mongodb';
import RouteScheduleVehicle from '@/models/RouteScheduleVehicle';

const routeService = new RouteService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: routeId } = await params;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const route = await routeService.getById(routeId, branchId);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    await connectDB();
    const list = await RouteScheduleVehicle.find({ routeId, branchId })
      .select('workScheduleId vehicleId')
      .lean()
      .exec();

    const scheduleVehicles = list.map((sv: any) => ({
      workScheduleId: String(sv.workScheduleId),
      vehicleId: String(sv.vehicleId),
    }));

    return NextResponse.json({ scheduleVehicles });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: routeId } = await params;
    const body = await request.json();
    const branchId = resolveBranchId(session, body.branchId);

    const route = await routeService.getById(routeId, branchId);
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    const scheduleVehicles = Array.isArray(body.scheduleVehicles) ? body.scheduleVehicles : [];

    await connectDB();
    await RouteScheduleVehicle.deleteMany({ routeId, branchId }).exec();

    if (scheduleVehicles.length > 0) {
      await RouteScheduleVehicle.insertMany(
        scheduleVehicles.map((sv: { workScheduleId: string; vehicleId: string }) => ({
          routeId,
          branchId,
          workScheduleId: sv.workScheduleId,
          vehicleId: sv.vehicleId,
        }))
      );
    }

    const list = await RouteScheduleVehicle.find({ routeId, branchId })
      .select('workScheduleId vehicleId')
      .lean()
      .exec();

    return NextResponse.json({
      scheduleVehicles: list.map((sv: any) => ({
        workScheduleId: String(sv.workScheduleId),
        vehicleId: String(sv.vehicleId),
      })),
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
