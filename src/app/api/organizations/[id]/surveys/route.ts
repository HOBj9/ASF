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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    const branchIdForFilter =
      isBranchAdmin(role) || (role && typeof role === 'object' && (role as any).name === 'line_supervisor')
        ? sessionBranchId
        : undefined;

    const surveys = await surveyService.listByOrganization(organizationId, activeOnly, branchIdForFilter);
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
    const { id: organizationIdParam } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const body = await request.json();

    const {
      title,
      titleAr,
      description,
      descriptionAr,
      questions,
      isActive,
      branchId: bodyBranchId,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'عنوان الاستبيان مطلوب' }, { status: 400 });
    }

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    let branchId: string | null = null;
    if (isBranchAdmin(role)) {
      branchId = sessionBranchId;
    } else if (bodyBranchId !== undefined) {
      branchId = bodyBranchId && String(bodyBranchId).trim() ? bodyBranchId : null;
    }

    const survey = await surveyService.create(organizationId, {
      title: title.trim(),
      titleAr: titleAr?.trim() || undefined,
      description: description?.trim() || undefined,
      descriptionAr: descriptionAr?.trim() || undefined,
      questions: Array.isArray(questions) ? questions : [],
      isActive: isActive !== false,
      branchId,
    });

    return NextResponse.json({ survey }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
