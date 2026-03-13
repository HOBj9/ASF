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
    const authResult = await requirePermission(permissionResources.FORMS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationIdParam, surveyId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const survey = await surveyService.getById(surveyId, organizationId);
    if (!survey) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    if (sessionBranchId && (isBranchAdmin(role) || (role && typeof role === 'object' && (role as any).name === 'line_supervisor'))) {
      const surveyBranchId = survey.branchId ? String(survey.branchId) : null;
      if (surveyBranchId !== null && surveyBranchId !== sessionBranchId) {
        return NextResponse.json({ error: 'غير مصرح بعرض هذا الاستبيان' }, { status: 403 });
      }
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
    const { id: organizationIdParam, surveyId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const existing = await surveyService.getById(surveyId, organizationId);
    if (!existing) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    if (isBranchAdmin(role) && sessionBranchId) {
      const existingBranchId = existing.branchId ? String(existing.branchId) : null;
      if (existingBranchId !== sessionBranchId) {
        return NextResponse.json({ error: 'غير مصرح بتحديث هذا الاستبيان' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, titleAr, description, descriptionAr, questions, isActive, branchId: bodyBranchId } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (titleAr !== undefined) updateData.titleAr = titleAr ? String(titleAr).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr ? String(descriptionAr).trim() : null;
    if (questions !== undefined) updateData.questions = Array.isArray(questions) ? questions : existing.questions;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (!isBranchAdmin(role)) {
      if (bodyBranchId !== undefined) {
        updateData.branchId = bodyBranchId && String(bodyBranchId).trim() ? bodyBranchId : null;
      }
    }

    const survey = await surveyService.update(surveyId, organizationId, updateData as any);
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
    const { id: organizationIdParam, surveyId } = await params;
    const organizationId = await resolveOrganizationId(session, organizationIdParam);

    const existing = await surveyService.getById(surveyId, organizationId);
    if (!existing) {
      return NextResponse.json({ error: 'الاستبيان غير موجود' }, { status: 404 });
    }

    const sessionBranchId = (session?.user as any)?.branchId ?? null;
    const role = session?.user?.role;
    if (isBranchAdmin(role) && sessionBranchId) {
      const existingBranchId = existing.branchId ? String(existing.branchId) : null;
      if (existingBranchId !== sessionBranchId) {
        return NextResponse.json({ error: 'غير مصرح بحذف هذا الاستبيان' }, { status: 403 });
      }
    }

    const deleted = await surveyService.delete(surveyId, organizationId);
    if (!deleted) {
      return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
