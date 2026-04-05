export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/middleware/api-auth.middleware';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';

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
      return NextResponse.json(
        { error: 'لا توجد مؤسسة مرتبطة بحساب مشرف الخط' },
        { status: 403 }
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
  } catch (error: any) {
    return handleApiError(error);
  }
}
