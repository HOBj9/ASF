export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

const surveyService = new SurveyService();

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const { surveyId } = await params;

    const result = await surveyService.submitFromMobile(
      surveyId,
      user.id,
      user.organizationId,
      body,
      user.branchId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
