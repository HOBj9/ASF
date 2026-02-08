import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin, isOrganizationAdmin } from '@/lib/permissions';
import MaterialStock from '@/models/MaterialStock';
import Point from '@/models/Point';

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.MATERIALS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const pointId = searchParams.get('pointId');

    await connectDB();

    if (scope === 'org') {
      if (!isAdmin(session.user.role as any) && !isOrganizationAdmin(session.user.role as any)) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      }
      const organizationId = await resolveOrganizationId(session, searchParams.get('organizationId'));
      const stocks = await MaterialStock.aggregate([
        { $match: { organizationId } },
        { $lookup: { from: 'materials', localField: 'materialId', foreignField: '_id', as: 'material' } },
        { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'materials',
            localField: 'material.originMaterialId',
            foreignField: '_id',
            as: 'originMaterial',
          },
        },
        {
          $addFields: {
            rootMaterialId: {
              $ifNull: [
                { $arrayElemAt: ['$originMaterial.originMaterialId', 0] },
                { $ifNull: ['$material.originMaterialId', '$materialId'] },
              ],
            },
          },
        },
        { $group: { _id: '$rootMaterialId', quantity: { $sum: '$quantity' } } },
        { $project: { _id: 0, materialId: '$_id', quantity: 1 } },
      ]);
      return NextResponse.json({ stocks });
    }

    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    if (pointId) {
      const point = await Point.findOne({ _id: pointId, branchId }).lean();
      if (!point) {
        return NextResponse.json({ error: 'النقطة غير موجودة' }, { status: 404 });
      }

      const stocks = await MaterialStock.find({ branchId, pointId }).sort({ updatedAt: -1 }).lean();
      return NextResponse.json({ stocks });
    }

    const stocks = await MaterialStock.aggregate([
      { $match: { branchId } },
      { $lookup: { from: 'materials', localField: 'materialId', foreignField: '_id', as: 'material' } },
      { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          rootMaterialId: { $ifNull: ['$material.originMaterialId', '$materialId'] },
        },
      },
      { $group: { _id: '$rootMaterialId', quantity: { $sum: '$quantity' } } },
      { $project: { _id: 0, materialId: '$_id', quantity: 1 } },
    ]);

    return NextResponse.json({ stocks });
  } catch (error: any) {
    return handleApiError(error);
  }
}
}
