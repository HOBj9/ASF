import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { resolveMunicipalityId } from '@/lib/utils/municipality.util';
import Municipality from '@/models/Municipality';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const { searchParams } = new URL(request.url);
    const municipalityId = resolveMunicipalityId(session, searchParams.get('municipalityId'));

    const municipality = await Municipality.findById(municipalityId).lean();
    if (!municipality) {
      return NextResponse.json({ error: 'البلدية غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ municipality });
  } catch (error: any) {
    return handleApiError(error);
  }
}
