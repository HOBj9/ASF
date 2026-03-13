export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import Branch from '@/models/Branch';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = resolveBranchId(session, searchParams.get('branchId'));

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error: any) {
    return handleApiError(error);
  }
}

