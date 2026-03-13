export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
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
      const foundUnit = await (Unit.findOne({
        _id: currentId,
        organizationId,
      })
        .select('_id baseUnitId factor')
        .lean() as Promise<{
          _id: mongoose.Types.ObjectId;
          baseUnitId?: mongoose.Types.ObjectId | null;
          factor?: number;
        } | null>);
      if (!foundUnit) {
        throw new Error('الوحدة غير موجودة');
      }
      unit = {
        _id: String(foundUnit._id),
        baseUnitId: foundUnit.baseUnitId ? String(foundUnit.baseUnitId) : null,
        factor: typeof foundUnit.factor === 'number' ? foundUnit.factor : 1,
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

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { fromPointId, toPointId, materialId, quantity, unitId, note } = body || {};

    if (!fromPointId || !toPointId || !materialId) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }
    if (fromPointId === toPointId) {
      return NextResponse.json({ error: 'لا يمكن التحويل إلى نفس النقطة' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'الكمية غير صحيحة' }, { status: 400 });
    }

    await connectDB();

    const branchId = resolveBranchId(session, body.branchId);
    const organizationId = await resolveOrganizationId(session, body.organizationId);

    const [fromPoint, toPoint] = await Promise.all([
      Point.findOne({ _id: fromPointId, branchId }).lean(),
      Point.findOne({ _id: toPointId, branchId }).lean(),
    ]);
    if (!fromPoint || !toPoint) {
      return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
    }

    const material = await Material.findOne({
      _id: materialId,
      branchId,
      $or: [{ pointId: fromPointId }, { pointId: null }],
    }).lean();
    if (!material) {
      return NextResponse.json({ error: 'المادة غير موجودة' }, { status: 404 });
    }

    const rootMaterialId = material.originMaterialId ? String(material.originMaterialId) : String(material._id);
    let destMaterial = await Material.findOne({
      branchId,
      pointId: toPointId,
      originMaterialId: rootMaterialId,
    }).lean();
    if (!destMaterial && !material.pointId) {
      destMaterial = material;
    }
    if (!destMaterial) {
      return NextResponse.json({ error: 'المادة غير متاحة في نقطة الوجهة' }, { status: 400 });
    }

    const fromMaterialId = String(material._id);
    const toMaterialId = String(destMaterial._id);

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

    const sourceStock = await MaterialStock.findOne({
      branchId,
      pointId: fromPointId,
      materialId: fromMaterialId,
    }).lean();
    const sourceQuantity = sourceStock?.quantity || 0;
    const nextSourceQuantity = sourceQuantity - quantityBase;
    if (nextSourceQuantity < 0) {
      return NextResponse.json({ error: 'الرصيد غير كافٍ في نقطة المصدر' }, { status: 400 });
    }

    const destStock = await MaterialStock.findOne({
      branchId,
      pointId: toPointId,
      materialId: toMaterialId,
    }).lean();
    const destQuantity = destStock?.quantity || 0;
    const nextDestQuantity = destQuantity + quantityBase;

    await MaterialStock.updateOne(
      { branchId, pointId: fromPointId, materialId: fromMaterialId },
      {
        $set: {
          organizationId,
          branchId,
          pointId: fromPointId,
          materialId: fromMaterialId,
          quantity: nextSourceQuantity,
        },
      },
      { upsert: true }
    );

    await MaterialStock.updateOne(
      { branchId, pointId: toPointId, materialId: toMaterialId },
      {
        $set: {
          organizationId,
          branchId,
          pointId: toPointId,
          materialId: toMaterialId,
          quantity: nextDestQuantity,
        },
      },
      { upsert: true }
    );

    const transferId = new mongoose.Types.ObjectId().toString();
    const noteText = note || null;

    const [outTx, inTx] = await MaterialTransaction.create(
      [
        {
          organizationId,
          branchId,
          pointId: fromPointId,
          materialId: fromMaterialId,
          type: 'out',
          quantity: qty,
          unitId: effectiveUnitId,
          quantityBase,
          deltaBase: -Math.abs(quantityBase),
          balanceAfter: nextSourceQuantity,
          transferId,
          relatedPointId: toPointId,
          note: noteText,
          createdBy: session?.user?.id || null,
        },
        {
          organizationId,
          branchId,
          pointId: toPointId,
          materialId: toMaterialId,
          type: 'in',
          quantity: qty,
          unitId: effectiveUnitId,
          quantityBase,
          deltaBase: Math.abs(quantityBase),
          balanceAfter: nextDestQuantity,
          transferId,
          relatedPointId: fromPointId,
          note: noteText,
          createdBy: session?.user?.id || null,
        },
      ],
      { ordered: true }
    );

    return NextResponse.json({ transferId, outTransaction: outTx, inTransaction: inTx }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 50);

    await connectDB();

    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const transactions = await MaterialTransaction.find({
      branchId,
      transferId: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limit) ? Math.min(limit, 200) : 50)
      .lean();

    const map = new Map<string, any>();
    transactions.forEach((tx: any) => {
      const key = String(tx.transferId);
      const existing = map.get(key) || { transferId: key };
      if (tx.type === 'out') {
        existing.fromPointId = tx.pointId;
        existing.materialId = tx.materialId;
        existing.quantity = tx.quantity;
        existing.unitId = tx.unitId || null;
        existing.note = tx.note || null;
        existing.outBalanceAfter = tx.balanceAfter;
        existing.createdAt = existing.createdAt || tx.createdAt;
      } else if (tx.type === 'in') {
        existing.toPointId = tx.pointId;
        existing.materialId = existing.materialId || tx.materialId;
        existing.quantity = existing.quantity ?? tx.quantity;
        existing.unitId = existing.unitId || tx.unitId || null;
        existing.note = existing.note || tx.note || null;
        existing.inBalanceAfter = tx.balanceAfter;
        existing.createdAt = existing.createdAt || tx.createdAt;
      }
      map.set(key, existing);
    });

    const transfers = Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return handleApiError(error);
  }
}
