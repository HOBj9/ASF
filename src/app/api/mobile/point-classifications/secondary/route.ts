export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';
import { listMobileSecondaryPointClassifications } from '@/lib/utils/mobile-point-classification.util';

const pointClassificationService = new PointClassificationService();

export async function GET(request: Request) {
  try {
    const authResult = await requireMobileLineSupervisorAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    if (!user.organizationId) {
      return mobileErrorResponse(
        'لا توجد مؤسسة مرتبطة بحساب مشرف الخط',
        'MOBILE_ORGANIZATION_NOT_ASSIGNED',
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const primaryClassificationId = searchParams.get('primaryClassificationId');
    const secondaries = await listMobileSecondaryPointClassifications(
      pointClassificationService,
      user.organizationId,
      user.branchId,
      primaryClassificationId
    );

    return NextResponse.json({ secondaries });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
