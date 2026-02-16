import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { SurveyService } from '@/lib/services/survey.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const surveyService = new SurveyService();

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return;
  const sessionOrg = session?.user?.organizationId?.toString?.();
  if (sessionOrg === organizationId) return;
  const branchId = session?.user?.branchId?.toString?.();
  if (branchId) {
    await connectDB();
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch && String(branch.organizationId) === organizationId) return;
  }
  throw new Error('لا يمكنك الوصول إلى هذه المؤسسة');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId, surveyId } = await params;
    await ensureOrgAccess(session, organizationId);

    const survey = await surveyService.getById(surveyId, organizationId);
    if (!survey) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId, surveyId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { title, titleAr, description, descriptionAr, questions, isActive } = body;

    const survey = await surveyService.update(surveyId, organizationId, {
      title: title?.trim(),
      titleAr: titleAr?.trim(),
      description: description?.trim(),
      descriptionAr: descriptionAr?.trim(),
      questions: Array.isArray(questions) ? questions : undefined,
      isActive,
    });

    if (!survey) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId, surveyId } = await params;
    await ensureOrgAccess(session, organizationId);

    const deleted = await surveyService.delete(surveyId, organizationId);
    if (!deleted) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
