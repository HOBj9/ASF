import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import Organization from '@/models/Organization';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);
    const organization = await Organization.findById(organizationId).select('labels name').lean();

    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ labels: organization.labels, organizationName: organization.name });
  } catch (error: any) {
    return handleApiError(error);
  }
}

