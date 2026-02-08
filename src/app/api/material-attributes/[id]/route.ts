import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import MaterialCategory from '@/models/MaterialCategory';
import MaterialAttributeDefinition from '@/models/MaterialAttributeDefinition';
import Point from '@/models/Point';
import Unit from '@/models/Unit';

async function ensureAttributeAccess(session: any, attributeId: string) {
  const attribute = await MaterialAttributeDefinition.findById(attributeId).lean();
  if (!attribute) throw new Error('الخاصية غير موجودة');
  const category = await MaterialCategory.findById(attribute.categoryId).lean();
  if (!category) throw new Error('التصنيف غير موجود');
  const organizationId = await resolveOrganizationId(session, null);
  if (String(category.organizationId) !== String(organizationId)) {
    throw new Error('غير مصرح');
  }
  if (category.branchId) {
    if (!isAdmin(session.user.role as any)) {
      const branchId = resolveBranchId(session, null);
      if (String(category.branchId) !== String(branchId)) {
        throw new Error('غير مصرح');
      }
    }
    if (category.pointId) {
      const point = await Point.findOne({ _id: category.pointId, branchId: category.branchId }).lean();
      if (!point) {
        throw new Error('النقطة غير موجودة');
      }
    }
  } else if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
    throw new Error('غير مصرح');
  }
  return { attribute, category };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();

    await connectDB();
    const { attribute, category } = await ensureAttributeAccess(session, params.id);

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.required !== undefined) updateData.required = Boolean(body.required);
    if (body.options !== undefined) updateData.options = Array.isArray(body.options) ? body.options : [];
    if (body.unitId !== undefined) updateData.unitId = body.unitId || null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (category.pointId) updateData.isOverride = true;

    const updated = await MaterialAttributeDefinition.findByIdAndUpdate(attribute._id, updateData, { new: true }).lean();
    if (category.branchId && !category.pointId) {
      const points = await Point.find({ branchId: category.branchId }).select('_id').lean();
      for (const point of points) {
        const pointCategory = await MaterialCategory.findOne({
          branchId: category.branchId,
          pointId: String(point._id),
          originCategoryId: category._id,
        })
          .select('_id')
          .lean();
        if (!pointCategory) continue;

        const pointAttribute = await MaterialAttributeDefinition.findOne({
          originAttributeId: attribute._id,
          categoryId: pointCategory._id,
        });
        if (!pointAttribute || pointAttribute.isOverride) continue;

        const pointUpdate: any = { ...updateData };
        if (body.unitId !== undefined) {
          if (body.unitId) {
            const pointUnit = await Unit.findOne({
              organizationId: category.organizationId,
              branchId: category.branchId,
              pointId: String(point._id),
              originUnitId: body.unitId,
            })
              .select('_id')
              .lean();
            pointUpdate.unitId = pointUnit ? String(pointUnit._id) : null;
          } else {
            pointUpdate.unitId = null;
          }
        }

        await MaterialAttributeDefinition.findByIdAndUpdate(pointAttribute._id, pointUpdate).exec();
      }
    }

    return NextResponse.json({ attribute: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    await connectDB();

    const { attribute, category } = await ensureAttributeAccess(session, params.id);
    if (category.branchId && !category.pointId) {
      const pointAttributes = await MaterialAttributeDefinition.find({
        originAttributeId: attribute._id,
        isOverride: { $ne: true },
      }).lean();
      for (const pointAttribute of pointAttributes) {
        await MaterialAttributeDefinition.findByIdAndDelete(pointAttribute._id).exec();
      }
    }

    await MaterialAttributeDefinition.findByIdAndDelete(attribute._id).exec();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
