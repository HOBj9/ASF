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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; surveyId: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.FORM_SUBMISSIONS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id: organizationId, surveyId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { mapLat, mapLng, deviceLat, deviceLng, answers } = body;

    if (mapLat === undefined || mapLng === undefined || !Number.isFinite(Number(mapLat)) || !Number.isFinite(Number(mapLng))) {
      return NextResponse.json(
        { error: 'إحداثيات الموقع على الخريطة مطلوبة (mapLat, mapLng)' },
        { status: 400 }
      );
    }

    const result = await surveyService.submit(surveyId, userId, organizationId, {
      mapLat: Number(mapLat),
      mapLng: Number(mapLng),
      deviceLat: deviceLat != null ? Number(deviceLat) : null,
      deviceLng: deviceLng != null ? Number(deviceLng) : null,
      answers: answers && typeof answers === 'object' ? answers : {},
    });

    return NextResponse.json({ submission: result.submission, point: result.point }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
