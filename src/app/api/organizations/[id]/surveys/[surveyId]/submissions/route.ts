export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isBranchAdmin } from '@/lib/permissions';

const surveyService = new SurveyService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORM_SUBMISSIONS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, surveyId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    const branchIdForFilter =
      isBranchAdmin(role) || (role && typeof role === 'object' && (role as any).name === 'line_supervisor')
        ? sessionBranchId
        : undefined;

    const submissions = await surveyService.listSubmissions(surveyId, organizationId, branchIdForFilter);
    return NextResponse.json({ submissions });
  } catch (error: any) {
    return handleApiError(error);
  }
}
