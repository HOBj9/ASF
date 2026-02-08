import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import MaterialTransaction from '@/models/MaterialTransaction';
import MaterialStock from '@/models/MaterialStock';
import Material from '@/models/Material';
import Point from '@/models/Point';
import Unit from '@/models/Unit';

type UnitDoc = {
  _id: string;
  baseUnitId?: string | null;
  factor?: number;
};

async function resolveUnitFactorToRoot(
  unitId: string,
  organizationId: string,
  branchId: string,
  cache: Map<string, UnitDoc>
) {
  let currentId: string | null = unitId;
  let factor = 1;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error('هناك حلقة في تعريف الوحدات');
    }
    visited.add(currentId);

    let unit = cache.get(currentId);
    if (!unit) {
      const found = await Unit.findOne({
        _id: currentId,
        organizationId,
      })
        .select('_id baseUnitId factor')
        .lean();
      if (!found) {
        throw new Error('الوحدة غير موجودة');
      }
      unit = {
        _id: String(found._id),
        baseUnitId: found.baseUnitId ? String(found.baseUnitId) : null,
        factor: typeof found.factor === 'number' ? found.factor : 1,
      };
      cache.set(currentId, unit);
    }

    if (!unit.baseUnitId) {
      return { rootId: unit._id, factor };
    }

    factor *= Number(unit.factor) || 1;
    currentId = unit.baseUnitId ? String(unit.baseUnitId) : null;
  }

  throw new Error('فشل تحويل الوحدة');
}

async function convertToBase(
  quantity: number,
  unitId: string,
  baseUnitId: string,
  organizationId: string,
  branchId: string,
  cache: Map<string, UnitDoc>
) {
  if (unitId === baseUnitId) return quantity;

  const source = await resolveUnitFactorToRoot(unitId, organizationId, branchId, cache);
  const base = await resolveUnitFactorToRoot(baseUnitId, organizationId, branchId, cache);

  if (source.rootId !== base.rootId) {
    throw new Error('الوحدة غير متوافقة مع وحدة المادة');
  }

  return quantity * (source.factor / base.factor);
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const pointId = searchParams.get('pointId');
    const materialId = searchParams.get('materialId');
    const limit = Number(searchParams.get('limit') || 30);

    await connectDB();

    if (scope === 'org') {
      if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));
      const query: any = { organizationId };
      if (searchParams.get('branchId')) {
        query.branchId = searchParams.get('branchId');
      }
      if (pointId) query.pointId = pointId;
      if (materialId) query.materialId = materialId;

      const transactions = await MaterialTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(Number.isFinite(limit) ? Math.min(limit, 200) : 30)
        .lean();

      return NextResponse.json({ transactions });
    }

    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    if (pointId) {
      const point = await Point.findOne({ _id: pointId, branchId }).lean();
      if (!point) {
        return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
      }
    }

    const query: any = { branchId };
    if (pointId) query.pointId = pointId;
    if (materialId) query.materialId = materialId;

    const transactions = await MaterialTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limit) ? Math.min(limit, 200) : 30)
      .lean();

    return NextResponse.json({ transactions });
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
    const { pointId, materialId, type, quantity, unitId, note } = body || {};

    if (!pointId || !materialId || !type) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 });
    }

    if (type !== 'in' && type !== 'out' && type !== 'adjust') {
      return NextResponse.json({ error: 'نوع الحركة غير صحيح' }, { status: 400 });
    }

    if (type !== 'adjust' && qty === 0) {
      return NextResponse.json({ error: 'الكمية يجب أن تكون أكبر من صفر' }, { status: 400 });
    }

    await connectDB();

    const branchId = resolveBranchId(session, body.branchId);
    const organizationId = await resolveOrganizationId(session, body.organizationId);

    const point = await Point.findOne({ _id: pointId, branchId }).lean();
    if (!point) {
      return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
    }

    const material = await Material.findOne({
      _id: materialId,
      branchId,
      $or: [{ pointId }, { pointId: null }],
    }).lean();
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    const effectiveUnitId = unitId || material.baseUnitId || null;
    let quantityBase = qty;
    const cache = new Map<string, UnitDoc>();

    if (material.baseUnitId && effectiveUnitId) {
      quantityBase = await convertToBase(
        qty,
        String(effectiveUnitId),
        String(material.baseUnitId),
        organizationId,
        branchId,
        cache
      );
    }

    const existingStock = await MaterialStock.findOne({ branchId, pointId, materialId }).lean();
    const currentQuantity = existingStock?.quantity || 0;

    let deltaBase = quantityBase;
    if (type === 'out') {
      deltaBase = -Math.abs(quantityBase);
    } else if (type === 'adjust') {
      deltaBase = quantityBase - currentQuantity;
    }

    const nextQuantity = currentQuantity + deltaBase;

    await MaterialStock.updateOne(
      { branchId, pointId, materialId },
      {
        $set: {
          organizationId,
          branchId,
          pointId,
          materialId,
          quantity: nextQuantity,
        },
      },
      { upsert: true }
    );

    const transaction = await MaterialTransaction.create({
      organizationId,
      branchId,
      pointId,
      materialId,
      type,
      quantity: qty,
      unitId: effectiveUnitId,
      quantityBase,
      deltaBase,
      balanceAfter: nextQuantity,
      note: note || null,
      createdBy: session?.user?.id || null,
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
