import { NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/middleware/api-auth.middleware';
import connectDB from '@/lib/mongodb';
import IncomingAtharEvent from '@/models/IncomingAtharEvent';

function toUrl(pathname: string, query: Record<string, any> | null | undefined): string {
  const normalizedPath = pathname || '/api/athar/webhook/incoming';
  const entries = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return normalizedPath;
  const search = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
  return `${normalizedPath}?${search}`;
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    await connectDB();

    const [rows, total] = await Promise.all([
      IncomingAtharEvent.find({})
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IncomingAtharEvent.countDocuments({}),
    ]);

    const logs = rows.map((row: any) => ({
      _id: String(row._id),
      method: row.sourceMethod || 'GET',
      url: toUrl(row.sourcePath, row.query),
      headers: row.headers || {},
      query: row.query || {},
      body: row.body ?? null,
      receivedAt: row.receivedAt || row.createdAt,
      createdAt: row.createdAt,
    }));

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
