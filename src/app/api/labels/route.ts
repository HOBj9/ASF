import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { sanitizeLabels } from '@/lib/utils/labels.util';
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

    const labels = sanitizeLabels(organization.labels);
    const organizationName = organization.name && !/^[\s?]+$/.test(String(organization.name).trim())
      ? organization.name
      : 'المؤسسة';

    return NextResponse.json({ labels, organizationName });
  } catch (error: any) {
    return handleApiError(error);
  }
}

