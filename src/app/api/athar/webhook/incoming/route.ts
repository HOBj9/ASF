import { NextResponse } from 'next/server';

async function handleIncoming(request: Request) {
  const method = request.method;
  const url = request.url;
  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    headers[name] = value;
  });

  let body: unknown = null;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else {
        body = await request.text();
      }
    } catch (e) {
      body = '(parse error)';
    }
  }

  const { searchParams } = new URL(request.url);
  const queryPayload = Object.fromEntries(searchParams.entries());

  const dump = {
    timestamp: new Date().toISOString(),
    method,
    url,
    headers,
    query: queryPayload,
    body,
  };

  console.log('[Athar Webhook Incoming] received request dump:', JSON.stringify(dump, null, 2));

  return NextResponse.json({ success: true, message: 'received' });
}

export async function GET(request: Request) {
  return handleIncoming(request);
}

export async function POST(request: Request) {
  return handleIncoming(request);
}
