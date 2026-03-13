export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';

const surveyService = new SurveyService();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORM_SUBMISSIONS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id: organizationIdParam, surveyId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const sessionBranchId = (session?.user as any)?.branchId ?? null;

    const body = await request.json();
    const { mapLat, mapLng, deviceLat, deviceLng, answers } = body;

    if (typeof mapLat !== 'number' || typeof mapLng !== 'number' || !Number.isFinite(mapLat) || !Number.isFinite(mapLng)) {
      return NextResponse.json({ error: 'إحداثيات الخريطة مطلوبة' }, { status: 400 });
    }

    const result = await surveyService.submit(
      surveyId,
      userId,
      organizationId,
      {
        mapLat: Number(mapLat),
        mapLng: Number(mapLng),
        deviceLat: deviceLat != null ? Number(deviceLat) : null,
        deviceLng: deviceLng != null ? Number(deviceLng) : null,
        answers: answers && typeof answers === 'object' ? answers : {},
      },
      sessionBranchId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
