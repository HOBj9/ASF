import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import MaterialCategory from '@/models/MaterialCategory';
import MaterialCategoryLink from '@/models/MaterialCategoryLink';
import Point from '@/models/Point';

async function updateDepths(
  categoryId: string,
  branchId: string | null,
  organizationId: string,
  pointId?: string | null
) {
  const all = await MaterialCategory.find({
    organizationId,
    branchId,
    pointId: pointId ?? null,
  }).lean();
  const byId = new Map<string, any>();
  all.forEach((cat) => byId.set(String(cat._id), cat));

  const updateQueue: Array<{ id: string; depth: number }> = [];
  const start = byId.get(String(categoryId));
  if (!start) return;
  updateQueue.push({ id: String(start._id), depth: start.depth || 0 });

  while (updateQueue.length > 0) {
    const current = updateQueue.shift()!;
    const children = all.filter((c) => String(c.parentId || '') === current.id);
    for (const child of children) {
      const nextDepth = current.depth + 1;
      await MaterialCategory.findByIdAndUpdate(child._id, { depth: nextDepth }).exec();
      updateQueue.push({ id: String(child._id), depth: nextDepth });
    }
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();

    await connectDB();

    const category = await MaterialCategory.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(session, body.organizationId);
    if (String(category.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const branchId = category.branchId ? String(category.branchId) : null;
    const pointId = category.pointId ? String(category.pointId) : null;
    if (branchId) {
      const resolvedBranchId = resolveBranchId(session, body.branchId);
      if (pointId) {
        const point = await Point.findOne({ _id: pointId, branchId }).lean();
        if (!point) {
          return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
        }
      }
      if (String(resolvedBranchId) !== branchId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
    } else if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr || null;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder) || 0;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (pointId && category.originCategoryId) updateData.isOverride = true;

    if (body.parentId !== undefined) {
      if (body.parentId) {
        const parent = await MaterialCategory.findById(body.parentId).lean();
        if (!parent) {
          return NextResponse.json({ error: 'التصنيف الأب غير موجود' }, { status: 400 });
        }
        if (String(parent.organizationId) !== String(organizationId)) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
        if (branchId && String(parent.branchId) !== String(branchId)) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
        if (pointId && String(parent.pointId || '') !== String(pointId)) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
        if (!branchId && parent.branchId) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
        updateData.parentId = parent._id;
        updateData.depth = (parent.depth || 0) + 1;
      } else {
        updateData.parentId = null;
        updateData.depth = 0;
      }
    }

    const updated = await MaterialCategory.findByIdAndUpdate(category._id, updateData, { new: true }).lean();
    if (body.parentId !== undefined) {
      await updateDepths(String(category._id), branchId, String(organizationId), pointId);
    }

    if (branchId && !pointId) {
      const points = await Point.find({ branchId }).select('_id').lean();
      const baseUpdate: any = {};
      if (body.name !== undefined) baseUpdate.name = body.name;
      if (body.nameAr !== undefined) baseUpdate.nameAr = body.nameAr || null;
      if (body.sortOrder !== undefined) baseUpdate.sortOrder = Number(body.sortOrder) || 0;
      if (body.isActive !== undefined) baseUpdate.isActive = Boolean(body.isActive);

      if (body.parentId !== undefined) {
        for (const point of points) {
          const pointCategory = await MaterialCategory.findOne({
            branchId,
            pointId: String(point._id),
            originCategoryId: category._id,
          }).lean();
          if (!pointCategory || pointCategory.isOverride) continue;
          let mappedParentId: string | null = null;
          let mappedDepth = 0;
          if (body.parentId) {
            const pointParent = await MaterialCategory.findOne({
              branchId,
              pointId: String(point._id),
              originCategoryId: body.parentId,
            }).lean();
            mappedParentId = pointParent ? String(pointParent._id) : null;
            mappedDepth = (pointParent?.depth || 0) + 1;
          }
          await MaterialCategory.findByIdAndUpdate(pointCategory._id, {
            ...baseUpdate,
            parentId: mappedParentId,
            depth: mappedDepth,
          }).exec();
          await updateDepths(String(pointCategory._id), branchId, String(organizationId), String(point._id));
        }
      } else if (Object.keys(baseUpdate).length > 0) {
        await MaterialCategory.updateMany(
          { branchId, pointId: { $ne: null }, originCategoryId: category._id, isOverride: { $ne: true } },
          { $set: baseUpdate }
        ).exec();
      }
    }

    return NextResponse.json({ category: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);

    await connectDB();

    const category = await MaterialCategory.findById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));
    if (String(category.organizationId) !== String(organizationId)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const branchId = category.branchId ? String(category.branchId) : null;
    const pointId = category.pointId ? String(category.pointId) : null;
    if (branchId) {
      const resolvedBranchId = resolveBranchId(session, searchParams.get('branchId'));
      if (pointId) {
        const point = await Point.findOne({ _id: pointId, branchId }).lean();
        if (!point) {
          return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
        }
      }
      if (String(resolvedBranchId) !== branchId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
    } else if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const childrenCount = await MaterialCategory.countDocuments({ parentId: category._id });
    if (childrenCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف تصنيف يحتوي على تصنيفات فرعية' }, { status: 400 });
    }

    const linkCount = await MaterialCategoryLink.countDocuments({ categoryId: category._id });
    if (linkCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف تصنيف مرتبط بمواد' }, { status: 400 });
    }

    if (branchId && !pointId) {
      const pointCategories = await MaterialCategory.find({
        branchId,
        pointId: { $ne: null },
        originCategoryId: category._id,
        isOverride: { $ne: true },
      }).lean();
      for (const pointCategory of pointCategories) {
        await MaterialCategoryLink.deleteMany({ categoryId: pointCategory._id }).exec();
        await MaterialCategory.updateMany(
          { parentId: pointCategory._id },
          { $set: { parentId: null, depth: 0 } }
        ).exec();
        await MaterialCategory.findByIdAndDelete(pointCategory._id).exec();
      }
    }

    await MaterialCategory.findByIdAndDelete(category._id).exec();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
