export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

const surveyService = new SurveyService();

function toSurveySummary(survey: any) {
  return {
    id: String(survey._id),
    organizationId: survey.organizationId ? String(survey.organizationId) : null,
    branchId: survey.branchId ? String(survey.branchId) : null,
    title: survey.title,
    titleAr: survey.titleAr || null,
    description: survey.description || null,
    descriptionAr: survey.descriptionAr || null,
    questionCount: Array.isArray(survey.questions) ? survey.questions.length : 0,
    isActive: Boolean(survey.isActive),
    updatedAt: survey.updatedAt || null,
  };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireMobileLineSupervisorAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    if (!user.organizationId) {
      return mobileErrorResponse(
        'لا توجد مؤسسة مرتبطة بحساب مشرف الخط',
        'MOBILE_ORGANIZATION_NOT_ASSIGNED',
        403
      );
    }

    const surveys = await surveyService.listByOrganization(
      user.organizationId,
      true,
      user.branchId
    );

    return NextResponse.json({
      surveys: surveys.map(toSurveySummary),
    });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
