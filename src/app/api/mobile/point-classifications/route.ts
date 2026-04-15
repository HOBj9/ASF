export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import {
  listMobilePointClassifications,
} from '@/lib/utils/mobile-point-classification.util';
import {
  handleMobileApiError,
  mobileErrorResponse,
} from '@/lib/utils/mobile-api-error.util';

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
    const classifications = await listMobilePointClassifications(
      pointClassificationService,
      user.organizationId,
      user.branchId
    );

    return NextResponse.json({
      primaries: classifications.primaries,
      secondaries: primaryClassificationId
        ? classifications.secondaries.filter(
            (item) => String(item.primaryClassificationId || '') === String(primaryClassificationId)
          )
        : classifications.secondaries,
    });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
