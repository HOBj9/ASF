import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { cloneBranchMaterialTreeToPoint, cloneOrganizationMaterialTreeToBranch } from '@/lib/services/material-tree.service';
import Unit from '@/models/Unit';
import Point from '@/models/Point';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.UNITS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const pointId = searchParams.get('pointId');

    await connectDB();

    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));

    if (scope === 'org') {
      if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      const units = await Unit.find({ organizationId, branchId: null }).sort({ name: 1 }).lean();
      return NextResponse.json({ units });
    }

    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    if (scope === 'point' || pointId) {
      if (!pointId) {
        return NextResponse.json({ error: 'يرجى تحديد النقطة' }, { status: 400 });
      }
      const point = await Point.findOne({ _id: pointId, branchId }).lean();
      if (!point) {
        return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
      }

      await cloneBranchMaterialTreeToPoint(organizationId, branchId, pointId);

      const units = await Unit.find({ organizationId, branchId, pointId })
        .sort({ name: 1 })
        .lean();
      return NextResponse.json({ units });
    }

    await cloneOrganizationMaterialTreeToBranch(organizationId, branchId);

    const units = await Unit.find({ organizationId, branchId, pointId: null })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ units });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.UNITS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { name, nameAr, symbol, baseUnitId, factor, isActive, scope, pointId } = body || {};

    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    await connectDB();

    const organizationId = await resolveOrganizationId(session, body.organizationId);
    let branchId: string | null = null;
    let resolvedPointId: string | null = null;
    if (scope !== 'org') {
      branchId = resolveBranchId(session, body.branchId);
      if (scope === 'point') {
        if (!pointId) {
          return NextResponse.json({ error: 'يرجى تحديد النقطة' }, { status: 400 });
        }
        const point = await Point.findOne({ _id: pointId, branchId }).lean();
        if (!point) {
          return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
        }
        resolvedPointId = pointId;
      }
    } else if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const unit = await Unit.create({
      organizationId,
      branchId,
      pointId: resolvedPointId,
      originUnitId: null,
      name,
      nameAr: nameAr || null,
      symbol: symbol || null,
      baseUnitId: baseUnitId || null,
      factor: Number.isFinite(Number(factor)) ? Number(factor) : 1,
      isActive: isActive !== false,
      isOverride: scope === 'point',
    });

    if (scope === 'branch' && branchId) {
      const points = await Point.find({ branchId }).select('_id').lean();
      for (const point of points) {
        const mappedBaseUnitId = baseUnitId
          ? await Unit.findOne({
              organizationId,
              branchId,
              pointId: String(point._id),
              originUnitId: baseUnitId,
            })
              .select('_id')
              .lean()
          : null;
        await Unit.create({
          organizationId,
          branchId,
          pointId: String(point._id),
          originUnitId: unit._id,
          name: unit.name,
          nameAr: unit.nameAr || null,
          symbol: unit.symbol || null,
          baseUnitId: mappedBaseUnitId?._id || null,
          factor: Number.isFinite(Number(unit.factor)) ? Number(unit.factor) : 1,
          isActive: unit.isActive !== false,
          isOverride: false,
        });
      }
    }

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

