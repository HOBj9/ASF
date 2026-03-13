export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import Organization from '@/models/Organization';

export async function GET() {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);
    const organization = await Organization.findById(organizationId).lean();

    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const organizationId = await resolveOrganizationId(session);
    const body = await request.json();

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.labels) updateData.labels = body.labels;

    const organization = await Organization.findByIdAndUpdate(organizationId, updateData, { new: true })
      .lean();

    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    return handleApiError(error);
  }
}

