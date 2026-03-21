import { NextResponse } from "next/server";

/**
 * Add Cache-Control headers to a NextResponse.
 * Use `private` to prevent CDN/shared caching (data is user-scoped).
 */
export function withCache(response: NextResponse, maxAge: number, staleWhileRevalidate?: number): NextResponse {
  const parts = [`private`, `max-age=${maxAge}`];
  if (staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }
  response.headers.set("Cache-Control", parts.join(", "));
  return response;
}

export function withNoCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
