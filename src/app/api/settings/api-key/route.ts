export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/middleware/api-auth.middleware';
import { ApiKeyService } from '@/lib/services/api-key.service';

const apiKeyService = new ApiKeyService();

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.session.user.id;
    const data = await apiKeyService.getMetadata(userId);
    return NextResponse.json({ data });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.session.user.id;
    const data = await apiKeyService.createOrRotate(userId);
    return NextResponse.json({ data, message: 'تم إنشاء API key بنجاح' }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.session.user.id;
    const data = await apiKeyService.createOrRotate(userId);
    return NextResponse.json({ data, message: 'تم تجديد API key بنجاح' });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.session.user.id;
    await apiKeyService.deleteByUserId(userId);
    return NextResponse.json({ data: { deleted: true }, message: 'تم حذف API key بنجاح' });
  } catch (error: any) {
    return handleApiError(error);
  }
}
