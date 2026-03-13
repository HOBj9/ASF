import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { WorkScheduleService } from '@/lib/services/work-schedule.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveBranchId } from '@/lib/utils/municipality.util';

const service = new WorkScheduleService();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.WORK_SCHEDULES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: sourceId } = await params;
    const body = await request.json();
    const { branchId: bodyBranchId } = body;

    const branchId = resolveBranchId(session, bodyBranchId);
    if (!branchId) {
      return NextResponse.json(
        { error: 'يرجى تحديد الفرع' },
        { status: 400 }
      );
    }

    const schedule = await service.createBranchCopy(branchId, sourceId);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
