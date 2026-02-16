import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { PointService } from '@/lib/services/point.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import { isAdmin } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const pointService = new PointService();

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
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.READ);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (scope === 'branches') {
      const Point = (await import('@/models/Point')).default;
      const Branch = (await import('@/models/Branch')).default;
      await connectDB();
      const branches = await Branch.find({ organizationId, isActive: true }).select('_id name nameAr').lean();
      const branchIds = branches.map((b) => b._id);
      const branchPoints = await Point.find({ branchId: { $in: branchIds } })
        .populate('branchId', 'name nameAr')
        .populate('createdByUserId', 'name email')
        .lean();
      return NextResponse.json({ points: branchPoints, branches });
    }

    const Point = (await import('@/models/Point')).default;
    await connectDB();
    const points = await Point.find({ organizationId, branchId: null })
      .populate('createdByUserId', 'name email')
      .lean();
    return NextResponse.json({ points });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission(permissionResources.POINTS, permissionActions.CREATE);
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { id: organizationId } = await params;
    await ensureOrgAccess(session, organizationId);

    const body = await request.json();
    const { name, nameAr, nameEn, type, lat, lng, radiusMeters, addressText, isActive } = body;
    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'الاسم والإحداثيات مطلوبة' },
        { status: 400 }
      );
    }

    const point = await pointService.createAtOrganization(organizationId, {
      name,
      nameAr,
      nameEn,
      type,
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: radiusMeters != null ? Number(radiusMeters) : undefined,
      addressText,
      isActive: isActive ?? true,
      createdByUserId: session?.user?.id ?? null,
    });

    return NextResponse.json({ point }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
