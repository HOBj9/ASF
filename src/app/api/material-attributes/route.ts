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

async function ensureCategoryAccess(session: any, categoryId: string) {
  const category = await MaterialCategory.findById(categoryId).lean();
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
  return category;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const categoryIds = searchParams.get('categoryIds');

    await connectDB();

    if (categoryIds) {
      const ids = categoryIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) return NextResponse.json({ attributes: [] });
      const attributes = await MaterialAttributeDefinition.find({ categoryId: { $in: ids } })
        .sort({ name: 1 })
        .lean();
      return NextResponse.json({ attributes });
    }

    if (!categoryId) {
      return NextResponse.json({ attributes: [] });
    }

    await ensureCategoryAccess(session, categoryId);

    const attributes = await MaterialAttributeDefinition.find({ categoryId }).sort({ name: 1 }).lean();
    return NextResponse.json({ attributes });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { categoryId, name, type, required, options, unitId } = body || {};

    if (!categoryId || !name || !type) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    await connectDB();
    const category = await ensureCategoryAccess(session, categoryId);

    const attribute = await MaterialAttributeDefinition.create({
      categoryId,
      originAttributeId: null,
      name,
      type,
      required: Boolean(required),
      options: Array.isArray(options) ? options : [],
      unitId: unitId || null,
      isActive: true,
      isOverride: Boolean(category.pointId),
    });

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

        let mappedUnitId: string | null = null;
        if (unitId) {
          const pointUnit = await Unit.findOne({
            organizationId: category.organizationId,
            branchId: category.branchId,
            pointId: String(point._id),
            originUnitId: unitId,
          })
            .select('_id')
            .lean();
          mappedUnitId = pointUnit ? String(pointUnit._id) : null;
        }

        await MaterialAttributeDefinition.create({
          categoryId: pointCategory._id,
          originAttributeId: attribute._id,
          name: attribute.name,
          type: attribute.type,
          required: attribute.required,
          options: attribute.options || [],
          unitId: mappedUnitId,
          isActive: attribute.isActive !== false,
          isOverride: false,
        });
      }
    }

    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

