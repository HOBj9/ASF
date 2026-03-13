export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { getDashboardAnalytics } from '@/lib/queries/dashboard/dashboard-analytics.query';

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const num = Math.floor(parsed);
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.REPORTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));
    const dailyDays = parsePositiveInt(searchParams.get('dailyDays'), 14, 7, 60);
    const monthlyMonths = parsePositiveInt(searchParams.get('monthlyMonths'), 12, 3, 24);

    const analytics = await getDashboardAnalytics(branchId, { dailyDays, monthlyMonths });
    return NextResponse.json({
      ...analytics,
      ranges: {
        dailyDays,
        monthlyMonths,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
