export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import connectDB from '@/lib/mongodb';
import Point from '@/models/Point';
import Branch from '@/models/Branch';
import { AtharService } from '@/lib/services/athar.service';

/**
 * POST: إنشاء مناطق في أثر لنقاط الفروع (بدون zoneId). body.pointIds اختياري؛ إن غاب يُعالج الكل المؤهل.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINTS,
      permissionActions.TRANSFER_TO_ATHAR
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const body = await request.json().catch(() => ({}));
    const pointIdsRaw = body?.pointIds as string[] | undefined;

    await connectDB();

    const branches = await Branch.find({ organizationId }).select('_id').lean().exec();
    const branchIds = branches.map((b) => b._id);

    const baseFilter: Record<string, unknown> = {
      branchId: { $in: branchIds },
      $or: [{ zoneId: null }, { zoneId: '' }],
    };

    if (pointIdsRaw && pointIdsRaw.length > 0) {
      const valid = pointIdsRaw.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (valid.length === 0) {
        return NextResponse.json({ error: 'لا توجد معرّفات صالحة' }, { status: 400 });
      }
      baseFilter._id = { $in: valid.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const branchPoints = await Point.find(baseFilter).lean().exec();

    const results: Array<{ pointId: string; zoneId?: string; error?: string }> = [];

    for (const branchPoint of branchPoints) {
      const pointId = String(branchPoint._id);
      const branchId = String(branchPoint.branchId);

      const branch = await Branch.findById(branchId).select('atharKey').lean();
      if (!branch?.atharKey) {
        results.push({
          pointId,
          error: 'مفتاح أثر غير معرّف للفرع',
        });
        continue;
      }

      const pointName = (branchPoint.nameAr || branchPoint.name || 'نقطة').trim();
      const radiusMeters = branchPoint.radiusMeters ?? 500;

      try {
        const atharService = await AtharService.forBranch(branchId);
        const zoneId = await atharService.createZone(
          pointName,
          { lat: branchPoint.lat, lng: branchPoint.lng },
          radiusMeters
        );
        if (zoneId) {
          await Point.findByIdAndUpdate(branchPoint._id, { zoneId });
          results.push({ pointId, zoneId });
        } else {
          results.push({ pointId, error: 'لم يُرجع أثر معرّف منطقة' });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل إنشاء المنطقة في أثر';
        results.push({ pointId, error: msg });
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
