import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin } from '@/lib/permissions';
import Unit from '@/models/Unit';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.UNITS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();

    await connectDB();

    const unit = await Unit.findById(params.id);
    if (!unit) {
      return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(session, body.organizationId);
    if (String(unit.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    if (unit.branchId) {
      const branchId = resolveBranchId(session, body.branchId);
      if (String(unit.branchId) !== String(branchId)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
    } else if (!isAdmin(session.user.role as any)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr || null;
    if (body.symbol !== undefined) updateData.symbol = body.symbol || null;
    if (body.baseUnitId !== undefined) updateData.baseUnitId = body.baseUnitId || null;
    if (body.factor !== undefined) updateData.factor = Number.isFinite(Number(body.factor)) ? Number(body.factor) : 1;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const updated = await Unit.findByIdAndUpdate(unit._id, updateData, { new: true }).lean();
    return NextResponse.json({ unit: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.UNITS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    await connectDB();

    const unit = await Unit.findById(params.id);
    if (!unit) {
      return NextResponse.json({ error: 'الوحدة غير موجودة' }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));
    if (String(unit.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    if (unit.branchId) {
      const branchId = resolveBranchId(session, searchParams.get('branchId'));
      if (String(unit.branchId) !== String(branchId)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
    } else if (!isAdmin(session.user.role as any)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    await Unit.findByIdAndDelete(unit._id).exec();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
