import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { CityService } from '@/lib/services/city.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new CityService();

async function ensureOrgAccess(session: any, organizationId: string): Promise<void> {
  if (isAdmin(session?.user?.role)) return;
  const sessionOrg = session?.user?.organizationId?.toString?.();
  if (sessionOrg === organizationId) return;
  const branchId = session?.user?.branchId?.toString?.();
  if (branchId) {
    await connectDB();
    const branch = await Branch.findById(branchId).select('organizationId').lean();
    if (branch && String(branch.organizationId) === organizationId) return;
  }
  throw new Error('لا يمكنك الوصول إلى هذه المؤسسة');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.CITIES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const { searchParams } = new URL(request.url);
    const governorateId = searchParams.get('governorateId');

    const cities = await service.list(organizationId, governorateId || undefined);
    return NextResponse.json({ cities });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(
      permissionResources.CITIES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { governorateId, name, nameAr, order } = body;
    if (!governorateId || !name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'المحافظة والاسم مطلوبان' },
        { status: 400 }
      );
    }

    const city = await service.create(organizationId, {
      governorateId,
      name: name.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? 0,
    });

    return NextResponse.json({ city }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
