export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { SurveyService } from '@/lib/services/survey.service';
import { PointService } from '@/lib/services/point.service';
import { AtharService } from '@/lib/services/athar.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import connectDB from '@/lib/mongodb';
import Point from '@/models/Point';
import Branch from '@/models/Branch';

const surveyService = new SurveyService();
const pointService = new PointService();

/**
 * POST: تحويل رد الاستبيان إلى نقطة في النظام ثم إنشاء المناطق في أثر.
 * 1) حفظ النقطة عندنا (على مستوى المؤسسة وربطها بالرد).
 * 2) نسخ النقطة إلى جميع الفروع.
 * 3) لكل فرع له مفتاح أثر: إنشاء منطقة في أثر وربطها بنقطة الفرع.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINTS,
      permissionActions.TRANSFER_TO_ATHAR
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, submissionId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const { point } = await surveyService.ensurePointFromSubmission(
      submissionId,
      organizationId
    );
    const pointId = point._id?.toString?.() ?? String(point._id);

    const pushed = await pointService.pushPointToAllBranches(organizationId, pointId);
    const orgPointName = point.name || point.nameAr || 'نقطة';

    await connectDB();
    const branchesWithAthar = await Branch.find({
      organizationId,
      isActive: true,
      atharKey: { $exists: true, $type: 'string', $ne: '' },
    })
      .select('_id')
      .lean()
      .exec();

    const radiusMeters = 500;
    let zonesCreated = 0;
    const errors: string[] = [];

    for (const branch of branchesWithAthar) {
      const branchId = branch._id.toString();
      const branchPoint = await Point.findOne({
        branchId,
        name: orgPointName,
      })
        .lean()
        .exec();

      if (!branchPoint) continue;
      if (branchPoint.zoneId) {
        continue;
      }

      try {
        const atharService = await AtharService.forBranch(branchId);
        const zoneId = await atharService.createZone(
          orgPointName,
          { lat: branchPoint.lat, lng: branchPoint.lng },
          radiusMeters
        );
        if (zoneId) {
          await Point.findByIdAndUpdate(branchPoint._id, { zoneId });
          zonesCreated++;
        }
      } catch (err: any) {
        errors.push(`الفرع ${branchId}: ${err?.message || 'فشل إنشاء المنطقة في أثر'}`);
      }
    }

    return NextResponse.json({
      point,
      pushed,
      zonesCreated,
      errors: errors.length ? errors : undefined,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
