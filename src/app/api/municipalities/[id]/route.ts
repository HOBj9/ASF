import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { MunicipalityService } from '@/lib/services/municipality.service';

const municipalityService = new MunicipalityService();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const municipality = await municipalityService.getById(params.id);
    if (!municipality) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ municipality });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const municipality = await municipalityService.update(params.id, body);
    if (!municipality) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ municipality });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const deleted = await municipalityService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error);
  }
}
