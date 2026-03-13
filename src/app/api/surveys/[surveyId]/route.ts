export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import connectDB from '@/lib/mongodb';
import Survey from '@/models/Survey';
import { permissionResources, permissionActions } from '@/constants/permissions';
import { isBranchAdmin } from '@/lib/permissions';

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

    const sessionOrgId = (session?.user as any)?.organizationId?.toString?.();
    const sessionBranchId = (session?.user as any)?.branchId?.toString?.();
    const surveyOrgId = (survey as any).organizationId?.toString?.();
    if (surveyOrgId !== sessionOrgId) {
      const branch = await (await import('@/models/Branch')).default.findById(sessionBranchId).select('organizationId').lean();
      if (!sessionBranchId || !branch || String((branch as any).organizationId) !== surveyOrgId) {
        return NextResponse.json({ error: 'غير مصرح بعرض هذا الاستبيان' }, { status: 403 });
      }
    }

    if (sessionBranchId && (isBranchAdmin((session?.user as any)?.role) || (session?.user as any)?.role?.name === 'line_supervisor')) {
      const surveyBranchId = (survey as any).branchId ? String((survey as any).branchId) : null;
      if (surveyBranchId !== null && surveyBranchId !== sessionBranchId) {
        return NextResponse.json({ error: 'غير مصرح بعرض هذا الاستبيان' }, { status: 403 });
      }
    }

    return NextResponse.json({ survey });
  } catch (error: any) {
    return handleApiError(error);
  }
}
