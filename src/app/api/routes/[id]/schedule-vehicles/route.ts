export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MongoServerError } from 'mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { RouteService } from '@/lib/services/route.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import connectDB from '@/lib/mongodb';
import RouteScheduleVehicle from '@/models/RouteScheduleVehicle';

const routeService = new RouteService();

function dedupeScheduleVehicles(
  items: { workScheduleId: string; vehicleId: string }[]
): { workScheduleId: string; vehicleId: string }[] {
  const seen = new Set<string>();
  const out: { workScheduleId: string; vehicleId: string }[] = [];
  for (const sv of items) {
    const ws = String(sv.workScheduleId ?? '').trim();
    const v = String(sv.vehicleId ?? '').trim();
    if (!ws || !v) continue;
    const key = `${ws}\0${v}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ workScheduleId: ws, vehicleId: v });
  }
  return out;
}

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

    const raw = Array.isArray(body.scheduleVehicles) ? body.scheduleVehicles : [];
    const scheduleVehicles = dedupeScheduleVehicles(raw);

    await connectDB();
    await RouteScheduleVehicle.deleteMany({ routeId, branchId }).exec();

    if (scheduleVehicles.length > 0) {
      try {
        await RouteScheduleVehicle.insertMany(
          scheduleVehicles.map((sv) => ({
            routeId,
            branchId,
            workScheduleId: sv.workScheduleId,
            vehicleId: sv.vehicleId,
          }))
        );
      } catch (insertErr: unknown) {
        const dupMsg = insertErr instanceof MongoServerError ? String(insertErr.message) : '';
        const isObsoletePairIndex =
          insertErr instanceof MongoServerError &&
          insertErr.code === 11000 &&
          dupMsg.includes('routeId_1_workScheduleId_1') &&
          !dupMsg.includes('routeId_1_workScheduleId_1_vehicleId_1');
        if (isObsoletePairIndex) {
          return NextResponse.json(
            {
              error:
                'فهرس قاعدة البيانات قديم: يمنع أكثر من مركبة لنفس المسار وجدول العمل. على الخادم شغّل: npm run fix:index:route-schedule-vehicles (مع MONGODB_URI)',
            },
            { status: 409 }
          );
        }
        throw insertErr;
      }
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
