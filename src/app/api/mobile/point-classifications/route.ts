export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireMobileLineSupervisorAuth } from '@/lib/middleware/mobile-line-supervisor-auth.middleware';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import {
  listMobilePointClassifications,
  nestMobilePointClassifications,
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
    const primaryClassificationId = searchParams.get('primaryClassificationId')?.trim() || null;

    const classifications = await listMobilePointClassifications(
      pointClassificationService,
      user.organizationId,
      user.branchId
    );

    let primaries = nestMobilePointClassifications(
      classifications.primaries,
      classifications.secondaries
    );

    if (primaryClassificationId) {
      primaries = primaries.filter((p) => String(p.id) === primaryClassificationId);
    }

    return NextResponse.json({ primaries });
  } catch (error) {
    return handleMobileApiError(error);
  }
}
