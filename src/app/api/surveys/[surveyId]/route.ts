import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Survey from '@/models/Survey';

const surveyService = new SurveyService();

/**
 * GET survey by id. User must belong to the survey's organization (session.organizationId or branch's org).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { surveyId } = await params;

    await connectDB();
    const survey = await Survey.findById(surveyId).lean();
    if (!survey) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    const orgId = (survey as any).organizationId?.toString?.();
    if (!orgId) {
      return NextResponse.json({ error: 'الاستبيان غير مرتبط بمؤسسة' }, { status: 400 });
    }

    const sessionOrg = (session?.user as any)?.organizationId?.toString?.();
    if (sessionOrg === orgId) {
      return NextResponse.json({ survey });
    }

    const branchId = (session?.user as any)?.branchId?.toString?.();
    if (branchId) {
      const branch = await Branch.findById(branchId).select('organizationId').lean();
      if (branch && String(branch.organizationId) === orgId) {
        return NextResponse.json({ survey });
      }
    }

    return NextResponse.json({ error: 'لا يمكنك الوصول إلى هذا الاستبيان' }, { status: 403 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
