import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { GovernorateService } from '@/lib/services/governorate.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new GovernorateService();

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
      permissionResources.GOVERNORATES,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const governorates = await service.list(organizationId);
    return NextResponse.json({ governorates });
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
      permissionResources.GOVERNORATES,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { name, nameAr, order } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const governorate = await service.create(organizationId, {
      name: name.trim(),
      nameAr: nameAr?.trim() || null,
      order: order ?? 0,
    });

    return NextResponse.json({ governorate }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
