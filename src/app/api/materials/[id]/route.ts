import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import Material from '@/models/Material';
import MaterialCategoryLink from '@/models/MaterialCategoryLink';
import MaterialAttributeValue from '@/models/MaterialAttributeValue';
import MaterialCategory from '@/models/MaterialCategory';
import MaterialAttributeDefinition from '@/models/MaterialAttributeDefinition';
import Point from '@/models/Point';
import Unit from '@/models/Unit';

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
      }
    }

    const material = await Material.findOne({ _id: params.id, organizationId, branchId, pointId: resolvedPointId }).lean();
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    const links = await MaterialCategoryLink.find({ materialId: material._id }).lean();
    const attributes = await MaterialAttributeValue.find({ materialId: material._id }).lean();

    return NextResponse.json({
      material,
      categoryIds: links.map((l) => String(l.categoryId)),
      attributes,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { name, nameAr, sku, baseUnitId, isActive, categoryIds, attributes, scope, pointId } = body || {};

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

    const material = await Material.findOne({ _id: params.id, organizationId, branchId, pointId: resolvedPointId });
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr || null;
    if (sku !== undefined) updateData.sku = sku;
    if (baseUnitId !== undefined) updateData.baseUnitId = baseUnitId || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (resolvedPointId && material.originMaterialId) updateData.isOverride = true;

    const updated = await Material.findByIdAndUpdate(material._id, updateData, { new: true }).lean();

    if (Array.isArray(categoryIds)) {
      await MaterialCategoryLink.deleteMany({ materialId: material._id }).exec();
      if (categoryIds.length > 0) {
        await MaterialCategoryLink.insertMany(
          categoryIds.map((categoryId: string, index: number) => ({
            materialId: material._id,
            categoryId,
            isPrimary: index === 0,
          }))
        );
      }
    }

    if (Array.isArray(attributes)) {
      await MaterialAttributeValue.deleteMany({ materialId: material._id }).exec();
      if (attributes.length > 0) {
        await MaterialAttributeValue.insertMany(
          attributes.map((attr: any) => ({
            materialId: material._id,
            attributeId: attr.attributeId,
            value: attr.value,
          }))
        );
      }
    }

    if (branchId && !resolvedPointId) {
      const points = await Point.find({ branchId }).select('_id').lean();
      for (const point of points) {
        const pointMaterial = await Material.findOne({
          branchId,
          pointId: String(point._id),
          originMaterialId: material._id,
        });
        if (!pointMaterial || pointMaterial.isOverride) continue;

        let mappedBaseUnitId: string | null | undefined = undefined;
        if (baseUnitId !== undefined) {
          if (baseUnitId) {
            const mappedUnit = await Unit.findOne({
              organizationId,
              branchId,
              pointId: String(point._id),
              originUnitId: baseUnitId,
            })
              .select('_id')
              .lean();
            mappedBaseUnitId = mappedUnit ? String(mappedUnit._id) : null;
          } else {
            mappedBaseUnitId = null;
          }
        }

        const pointUpdate: any = {};
        if (name !== undefined) pointUpdate.name = name;
        if (nameAr !== undefined) pointUpdate.nameAr = nameAr || null;
        if (sku !== undefined) pointUpdate.sku = sku;
        if (isActive !== undefined) pointUpdate.isActive = Boolean(isActive);
        if (mappedBaseUnitId !== undefined) pointUpdate.baseUnitId = mappedBaseUnitId;

        if (Object.keys(pointUpdate).length > 0) {
          await Material.findByIdAndUpdate(pointMaterial._id, pointUpdate).exec();
        }

        if (Array.isArray(categoryIds)) {
          const mappedCategoryIds: string[] = [];
          for (const catId of categoryIds) {
            const pointCategory = await MaterialCategory.findOne({
              branchId,
              pointId: String(point._id),
              originCategoryId: catId,
            })
              .select('_id')
              .lean();
            if (pointCategory) mappedCategoryIds.push(String(pointCategory._id));
          }

          await MaterialCategoryLink.deleteMany({ materialId: pointMaterial._id }).exec();
          if (mappedCategoryIds.length > 0) {
            await MaterialCategoryLink.insertMany(
              mappedCategoryIds.map((catId, index) => ({
                materialId: pointMaterial._id,
                categoryId: catId,
                isPrimary: index === 0,
              }))
            );
          }
        }

        if (Array.isArray(attributes)) {
          await MaterialAttributeValue.deleteMany({ materialId: pointMaterial._id }).exec();
          if (attributes.length > 0) {
            const attrIds = attributes.map((attr: any) => String(attr.attributeId));
            const pointAttributes = await MaterialAttributeDefinition.find({
              originAttributeId: { $in: attrIds },
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
    }

    return NextResponse.json({ material: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

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
      }
    }

    const material = await Material.findOne({ _id: params.id, organizationId, branchId }).lean();
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    if (branchId && !resolvedPointId) {
      const pointMaterials = await Material.find({
        branchId,
        pointId: { $ne: null },
        originMaterialId: material._id,
        isOverride: { $ne: true },
      }).lean();
      for (const pointMaterial of pointMaterials) {
        await MaterialAttributeValue.deleteMany({ materialId: pointMaterial._id }).exec();
        await MaterialCategoryLink.deleteMany({ materialId: pointMaterial._id }).exec();
        await Material.findByIdAndDelete(pointMaterial._id).exec();
      }
    }

    await MaterialAttributeValue.deleteMany({ materialId: material._id }).exec();
    await MaterialCategoryLink.deleteMany({ materialId: material._id }).exec();
    await Material.findByIdAndDelete(material._id).exec();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
