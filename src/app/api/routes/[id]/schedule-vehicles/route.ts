import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import Route from '@/models/Route';
import RouteScheduleVehicle from '@/models/RouteScheduleVehicle';
import Vehicle from '@/models/Vehicle';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    if (!branchId) {
      return NextResponse.json({ error: 'الفرع مطلوب' }, { status: 400 });
    }

    const { id: routeId } = await context.params;
    const route = await Route.findOne({ _id: routeId, branchId }).lean();
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    const list = await RouteScheduleVehicle.find({ routeId, branchId })
      .select('workScheduleId vehicleId')
      .lean();
    const scheduleVehicles = list.map((row) => ({
      workScheduleId: String(row.workScheduleId),
      vehicleId: String(row.vehicleId),
    }));

    return NextResponse.json({ scheduleVehicles });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.ROUTES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json().catch(() => ({}));
    const branchId = resolveBranchId(session, body.branchId);
    if (!branchId) {
      return NextResponse.json({ error: 'الفرع مطلوب' }, { status: 400 });
    }

    const { id: routeId } = await context.params;
    const route = await Route.findOne({ _id: routeId, branchId }).lean();
    if (!route) {
      return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });
    }

    const raw = body.scheduleVehicles;
    const scheduleVehicles: Array<{ workScheduleId: string; vehicleId: string }> = Array.isArray(raw)
      ? raw
          .map((item: unknown) => {
            if (item && typeof item === 'object' && 'workScheduleId' in item && 'vehicleId' in item) {
              const ws = String((item as any).workScheduleId).trim();
              const v = String((item as any).vehicleId).trim();
              if (ws && v && mongoose.Types.ObjectId.isValid(ws) && mongoose.Types.ObjectId.isValid(v)) {
                return { workScheduleId: ws, vehicleId: v };
              }
            }
            return null;
          })
          .filter(Boolean) as Array<{ workScheduleId: string; vehicleId: string }>
      : [];

    const branchIdObj = new mongoose.Types.ObjectId(branchId);
    const routeIdObj = new mongoose.Types.ObjectId(routeId);

    await RouteScheduleVehicle.deleteMany({ routeId: routeIdObj, branchId: branchIdObj });

    if (scheduleVehicles.length > 0) {
      const toInsert = scheduleVehicles.map(({ workScheduleId, vehicleId }) => ({
        routeId: routeIdObj,
        workScheduleId: new mongoose.Types.ObjectId(workScheduleId),
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        branchId: branchIdObj,
      }));
      await RouteScheduleVehicle.insertMany(toInsert);
    }

    const vehicleIds = scheduleVehicles.map((s) => s.vehicleId);
    await Vehicle.updateMany(
      { branchId: branchIdObj, routeId: routeIdObj },
      { $unset: { routeId: 1 } }
    );
    if (vehicleIds.length > 0) {
      await Vehicle.updateMany(
        { _id: { $in: vehicleIds.map((id) => new mongoose.Types.ObjectId(id)) }, branchId: branchIdObj },
        { $set: { routeId: routeIdObj } }
      );
    }

    const list = await RouteScheduleVehicle.find({ routeId: routeIdObj, branchId: branchIdObj })
      .select('workScheduleId vehicleId')
      .lean();
    const result = list.map((row) => ({
      workScheduleId: String(row.workScheduleId),
      vehicleId: String(row.vehicleId),
    }));

    return NextResponse.json({ scheduleVehicles: result });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
