import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { cloneBranchMaterialTreeToPoint, cloneOrganizationMaterialTreeToBranch } from '@/lib/services/material-tree.service';
import Material from '@/models/Material';
import MaterialCategoryLink from '@/models/MaterialCategoryLink';
import MaterialCategory from '@/models/MaterialCategory';
import MaterialAttributeValue from '@/models/MaterialAttributeValue';
import Point from '@/models/Point';
import Unit from '@/models/Unit';
import MaterialAttributeDefinition from '@/models/MaterialAttributeDefinition';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const pointId = searchParams.get('pointId');

    await connectDB();

    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));
    const canUseOrgScope =
      isAdmin(session.user.role as any) || isOrganizationAdmin(session.user.role as any);

    let branchId: string | null = null;
    let resolvedPointId: string | null = null;
    if (scope === 'org') {
      if (!canUseOrgScope) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      branchId = null;
    } else {
      branchId = resolveBranchId(session, searchParams.get('branchId'));
      if (scope === 'point' || pointId) {
        if (!pointId) {
          return NextResponse.json({ error: 'يرجى تحديد النقطة' }, { status: 400 });
        }
        const point = await Point.findOne({ _id: pointId, branchId }).lean();
        if (!point) {
          return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
        }
        resolvedPointId = pointId;
        await cloneBranchMaterialTreeToPoint(organizationId, branchId, pointId);
      } else {
        await cloneOrganizationMaterialTreeToBranch(organizationId, branchId);
      }
    }
    const categoryId = searchParams.get('categoryId');

    let materialIds: string[] | null = null;
    if (categoryId) {
      const links = await MaterialCategoryLink.find({ categoryId }).select('materialId').lean();
      materialIds = links.map((l) => String(l.materialId));
    }

    const query: any = { organizationId, branchId, pointId: resolvedPointId };
    if (materialIds) {
      query._id = { $in: materialIds };
    }

    const materials = await Material.find(query).sort({ name: 1 }).lean();
    const ids = materials.map((m) => m._id);

    const links = await MaterialCategoryLink.find({ materialId: { $in: ids } }).lean();
    const categoryIds = Array.from(new Set(links.map((l) => String(l.categoryId))));
    const categories = await MaterialCategory.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

    const materialCategories = new Map<string, string[]>();
    links.forEach((link) => {
      const key = String(link.materialId);
      const list = materialCategories.get(key) || [];
      list.push(String(link.categoryId));
      materialCategories.set(key, list);
    });

    const data = materials.map((material) => ({
      ...material,
      categoryIds: materialCategories.get(String(material._id)) || [],
      categories: (materialCategories.get(String(material._id)) || []).map((id) => categoryMap.get(id)).filter(Boolean),
    }));

    return NextResponse.json({ materials: data });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { name, nameAr, sku, baseUnitId, isActive, categoryIds = [], attributes = [], scope, pointId } = body || {};

    if (!name || !sku) {
      return NextResponse.json({ error: 'الاسم والكود مطلوبان' }, { status: 400 });
    }

    await connectDB();

    const organizationId = await resolveOrganizationId(session, body.organizationId);
    const canUseOrgScope =
      isAdmin(session.user.role as any) || isOrganizationAdmin(session.user.role as any);

    let branchId: string | null = null;
    let resolvedPointId: string | null = null;
    if (scope === 'org') {
      if (!canUseOrgScope) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      branchId = null;
    } else {
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
    }

    const material = await Material.create({
      organizationId,
      branchId,
      pointId: resolvedPointId,
      originMaterialId: null,
      name,
      nameAr: nameAr || null,
      sku,
      baseUnitId: baseUnitId || null,
      isActive: isActive !== false,
      isOverride: scope === 'point',
    });

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const links = categoryIds.map((categoryId: string, index: number) => ({
        materialId: material._id,
        categoryId,
        isPrimary: index === 0,
      }));
      await MaterialCategoryLink.insertMany(links);
    }

    if (Array.isArray(attributes) && attributes.length > 0) {
      await MaterialAttributeValue.insertMany(
        attributes.map((attr: any) => ({
          materialId: material._id,
          attributeId: attr.attributeId,
          value: attr.value,
        }))
      );
    }

    if (scope === 'branch' && branchId) {
      const points = await Point.find({ branchId }).select('_id').lean();
      const attrIds = Array.isArray(attributes) ? attributes.map((attr: any) => String(attr.attributeId)) : [];

      for (const point of points) {
        const mappedBaseUnit = baseUnitId
          ? await Unit.findOne({
              organizationId,
              branchId,
              pointId: String(point._id),
              originUnitId: baseUnitId,
            })
              .select('_id')
              .lean()
          : null;

        const pointMaterial = await Material.create({
          organizationId,
          branchId,
          pointId: String(point._id),
          originMaterialId: material._id,
          name: material.name,
          nameAr: material.nameAr || null,
          sku: material.sku,
          baseUnitId: mappedBaseUnit?._id || null,
          isActive: material.isActive !== false,
          isOverride: false,
        });

        const mappedCategoryIds: string[] = [];
        if (Array.isArray(categoryIds) && categoryIds.length > 0) {
          for (const catId of categoryIds) {
            const pointCategory = await MaterialCategory.findOne({
              organizationId,
              branchId,
              pointId: String(point._id),
              originCategoryId: catId,
            })
              .select('_id')
              .lean();
            if (pointCategory) mappedCategoryIds.push(String(pointCategory._id));
          }
        }

        if (mappedCategoryIds.length > 0) {
          const links = mappedCategoryIds.map((catId, index) => ({
            materialId: pointMaterial._id,
            categoryId: catId,
            isPrimary: index === 0,
          }));
          await MaterialCategoryLink.insertMany(links);
        }

        if (attrIds.length > 0 && mappedCategoryIds.length > 0) {
          const pointAttributes = await MaterialAttributeDefinition.find({
            originAttributeId: { $in: attrIds },
            categoryId: { $in: mappedCategoryIds },
          }).lean();
          const map = new Map(pointAttributes.map((attr: any) => [String(attr.originAttributeId), String(attr._id)]));
          const valuesPayload = attributes
            .map((attr: any) => {
              const mappedAttrId = map.get(String(attr.attributeId));
              if (!mappedAttrId) return null;
              return {
                materialId: pointMaterial._id,
                attributeId: mappedAttrId,
                value: attr.value,
              };
            })
            .filter(Boolean);
          if (valuesPayload.length > 0) {
            await MaterialAttributeValue.insertMany(valuesPayload as any[]);
          }
        }
      }
    }

    return NextResponse.json({ material }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
