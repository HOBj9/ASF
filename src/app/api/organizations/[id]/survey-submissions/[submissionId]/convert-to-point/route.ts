export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { SurveyService } from '@/lib/services/survey.service';
import { resolveOrganizationId } from '@/lib/utils/organization.util';

const surveyService = new SurveyService();

/**
 * POST: تحويل رد الاستبيان إلى نقطة على مستوى المؤسسة.
 * تُحفظ النقطة في النظام وترتبط بالرد (submission.pointId).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.FORM_SUBMISSIONS,
      permissionActions.UPDATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, submissionId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const { point, created } = await surveyService.ensurePointFromSubmission(
      submissionId,
      organizationId
    );

    return NextResponse.json({
      point,
      message: created ? 'تم إنشاء النقطة وربطها بالرد' : 'الرد مرتبط مسبقاً بنقطة',
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
