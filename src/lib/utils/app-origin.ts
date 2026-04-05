import type { NextRequest } from "next/server";

const normalizeOrigin = (value?: string | null) => {
  if (!value) return null;

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getRequestOrigin = (request: NextRequest) => {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
};

export const getAppOrigin = (request: NextRequest) => {
  const requestOrigin = normalizeOrigin(getRequestOrigin(request));
  const publicOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const authOrigin = normalizeOrigin(process.env.NEXTAUTH_URL);

  if (process.env.NODE_ENV === "production") {
    return publicOrigin || authOrigin || requestOrigin || "https://localhost";
  }

  return requestOrigin || publicOrigin || authOrigin || "http://localhost:3036";
};
