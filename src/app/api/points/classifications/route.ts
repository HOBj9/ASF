export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { PointClassificationService } from '@/lib/services/point-classification.service';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { resolveOrganizationId } from '@/lib/utils/organization.util';
import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';

const service = new PointClassificationService();

export async function GET(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.READ
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const organizationIdParam = searchParams.get('organizationId');

    if (branchId) {
      const resolvedBranchId = resolveBranchId(session, branchId);
      const { primaries, secondaries } = await service.listForBranch(resolvedBranchId);
      return NextResponse.json({ primaries, secondaries });
    }

    const organizationId = await resolveOrganizationId(session, organizationIdParam);
    const { primaries, secondaries } = await service.listForOrganization(organizationId);
    return NextResponse.json({ primaries, secondaries });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requirePermission(
      permissionResources.POINT_CLASSIFICATIONS,
      permissionActions.CREATE
    );
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { name, nameAr, order, primaryClassificationId, type } = body;

    const branchId = resolveBranchId(session, body.branchId);
    await connectDB();
    const branchDoc = await Branch.findById(branchId).select('organizationId').lean();
    if (!branchDoc) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }
    const organizationId = String(branchDoc.organizationId);

    if (type === 'primary') {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
      }
      const primary = await service.createPrimary(
        organizationId,
        { name: name.trim(), nameAr: nameAr?.trim() || null, order: order ?? 0 },
        branchId
      );
      return NextResponse.json({ primary }, { status: 201 });
    }

    if (type === 'secondary') {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
      }
      if (!primaryClassificationId) {
        return NextResponse.json({ error: 'التصنيف الأساسي مطلوب' }, { status: 400 });
      }
      const secondary = await service.createSecondary(
        organizationId,
        primaryClassificationId,
        { name: name.trim(), nameAr: nameAr?.trim() || null, order: order ?? 0 },
        branchId
      );
      return NextResponse.json({ secondary }, { status: 201 });
    }

    return NextResponse.json({ error: 'نوع التصنيف مطلوب (primary أو secondary)' }, { status: 400 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
