import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { BranchService } from '@/lib/services/branch.service';

const branchService = new BranchService();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const branch = await branchService.getById(params.id);
    if (!branch) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const branch = await branchService.update(params.id, body);
    if (!branch) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const deleted = await branchService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
