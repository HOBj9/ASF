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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true' || searchParams.get('active') === 'true';

    const surveys = await surveyService.listByOrganization(organizationId, activeOnly);
    return NextResponse.json({ surveys });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { title, titleAr, description, descriptionAr, questions, isActive } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'عنوان الاستبيان مطلوب' },
        { status: 400 }
      );
    }

    const survey = await surveyService.create(organizationId, {
      title: title.trim(),
      titleAr: titleAr?.trim(),
      description: description?.trim(),
      descriptionAr: descriptionAr?.trim(),
      questions: Array.isArray(questions) ? questions : [],
      isActive: isActive ?? true,
    });

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
