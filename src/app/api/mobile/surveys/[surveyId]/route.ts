export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';
import {
  listMobilePointClassifications,
  nestMobilePointClassifications,
} from '@/lib/utils/mobile-point-classification.util';

const surveyService = new SurveyService();
const pointClassificationService = new PointClassificationService();

function toMobileQuestion(question: any, index: number) {
  return {
    id: question?._id ? String(question._id) : null,
    index,
    answerKey: `question_${index}`,
    type: question?.type || 'text',
    questionText: question?.questionText || '',
    questionTextAr: question?.questionTextAr || null,
    options: Array.isArray(question?.options) ? question.options : [],
    required: Boolean(question?.required),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
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

    const { surveyId } = await params;
    const survey = await surveyService.getActiveForLineSupervisor(
      surveyId,
      user.organizationId,
      user.branchId
    );

    if (!survey) {
      return mobileErrorResponse(
        'الاستبيان غير موجود أو غير نشط',
        'MOBILE_SURVEY_NOT_FOUND',
        404
      );
    }

    const classifications = await listMobilePointClassifications(
      pointClassificationService,
      user.organizationId,
      user.branchId
    );
    const primariesNested = nestMobilePointClassifications(
      classifications.primaries,
      classifications.secondaries
    );

    return NextResponse.json({
      survey: {
        id: String(survey._id),
        organizationId: survey.organizationId ? String(survey.organizationId) : null,
        branchId: survey.branchId ? String(survey.branchId) : null,
        title: survey.title,
        titleAr: survey.titleAr || null,
        description: survey.description || null,
        descriptionAr: survey.descriptionAr || null,
        isActive: Boolean(survey.isActive),
        updatedAt: survey.updatedAt || null,
        questions: Array.isArray(survey.questions)
          ? survey.questions.map((question: any, index: number) =>
              toMobileQuestion(question, index)
            )
          : [],
      },
      submissionTemplate: {
        pointFields: {
          required: [
            'name',
            'primaryClassificationId',
            'secondaryClassificationId',
            'otherIdentifier',
            'mapLat',
            'mapLng',
          ],
        },
        classifications: {
          primaries: primariesNested,
        },
      },
    });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
