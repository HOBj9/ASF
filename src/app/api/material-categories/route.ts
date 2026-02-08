import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import { cloneBranchMaterialTreeToPoint, cloneOrganizationMaterialTreeToBranch } from '@/lib/services/material-tree.service';
import MaterialCategory from '@/models/MaterialCategory';
import Point from '@/models/Point';

function buildTree(list: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];
  list.forEach((item) => {
    map.set(String(item._id), { ...item, children: [] });
  });
  list.forEach((item) => {
    const node = map.get(String(item._id));
    if (item.parentId) {
      const parent = map.get(String(item.parentId));
      if (parent) {
        parent.children.push(node);
        return;
      }
    }
    roots.push(node);
  });
  return roots;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const pointId = searchParams.get('pointId');
    const tree = searchParams.get('tree') === '1';

    await connectDB();

    const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));

    if (scope === 'org') {
      if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      const categories = await MaterialCategory.find({ organizationId, branchId: null })
        .sort({ depth: 1, sortOrder: 1, name: 1 })
        .lean();
      return NextResponse.json({ categories: tree ? buildTree(categories) : categories });
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

      const categories = await MaterialCategory.find({ organizationId, branchId, pointId })
        .sort({ depth: 1, sortOrder: 1, name: 1 })
        .lean();
      return NextResponse.json({ categories: tree ? buildTree(categories) : categories });
    }

    await cloneOrganizationMaterialTreeToBranch(organizationId, branchId);

    const categories = await MaterialCategory.find({ organizationId, branchId, pointId: null })
      .sort({ depth: 1, sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({ categories: tree ? buildTree(categories) : categories });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIAL_CATEGORIES, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { name, nameAr, parentId, sortOrder, isActive, scope, pointId } = body || {};

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

    let depth = 0;
    if (parentId) {
      const parent = await MaterialCategory.findById(parentId).lean();
      if (!parent) {
        return NextResponse.json({ error: 'التصنيف الأب غير موجود' }, { status: 400 });
      }
      if (String(parent.organizationId) !== String(organizationId)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      if (scope === 'point') {
        if (String(parent.branchId) !== String(branchId) || String(parent.pointId || '') !== String(resolvedPointId || '')) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
      } else if (scope !== 'org' && String(parent.branchId) !== String(branchId)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      if (scope === 'org' && parent.branchId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      depth = (parent.depth || 0) + 1;
    }

    const category = await MaterialCategory.create({
      organizationId,
      branchId,
      pointId: resolvedPointId,
      parentId: parentId || null,
      name,
      nameAr: nameAr || null,
      depth,
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
      isOverride: scope === 'point',
    });

    if (scope === 'branch' && branchId) {
      const points = await Point.find({ branchId }).select('_id').lean();
      for (const point of points) {
        const pointParent = parentId
          ? await MaterialCategory.findOne({
              organizationId,
              branchId,
              pointId: String(point._id),
              originCategoryId: parentId,
            })
              .select('_id')
              .lean()
          : null;

        await MaterialCategory.create({
          organizationId,
          branchId,
          pointId: String(point._id),
          parentId: pointParent?._id || null,
          originCategoryId: category._id,
          name: category.name,
          nameAr: category.nameAr || null,
          depth,
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive !== false,
          isOverride: false,
        });
      }
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

