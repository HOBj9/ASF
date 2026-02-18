import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import connectDB from '@/lib/mongodb';
import WebhookIncomingLog from '@/models/WebhookIncomingLog';

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    await connectDB();

    const [logs, total] = await Promise.all([
      WebhookIncomingLog.find({})
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebhookIncomingLog.countDocuments({}),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
