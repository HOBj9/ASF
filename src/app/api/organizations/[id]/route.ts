import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { OrganizationService } from '@/lib/services/organization.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';

const organizationService = new OrganizationService();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const organization = await organizationService.getById(params.id);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.UPDATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const body = await request.json();
    const organization = await organizationService.update(params.id, body);
    if (!organization) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requirePermission(permissionResources.ORGANIZATIONS, permissionActions.DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const role = session?.user?.role || null;
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const deleted = await organizationService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
