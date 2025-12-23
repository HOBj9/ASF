/**
 * Session Ownership Middleware
 * Middleware to verify session ownership before processing requests
 */

import { NextResponse } from "next/server";
import { verifySessionOwnership, verifySessionActive } from "@/lib/utils/ownership.util";
import { sanitizeSessionName } from "@/lib/utils/validation.util";
import { errorResponse } from "@/lib/utils/api.util";

export interface SessionOwnershipContext {
  sessionName: string;
  userId: string | any;
  requireActive?: boolean;
}

/**
 * Middleware to verify session ownership
 * Can be used in route handlers to check if session belongs to user
 * @param sessionName - Session name to verify
 * @param userId - User ID to check ownership
 * @param requireActive - Whether to require active status
 * @param isAdmin - Whether user is admin (default: false). If true, allows access to default sessions.
 */
export async function requireSessionOwnership(
  sessionName: string | undefined | null,
  userId: string | any,
  requireActive: boolean = false,
  isAdmin: boolean = false
): Promise<NextResponse | null> {
  // Validate sessionName
  if (!sessionName) {
    return errorResponse('اسم الجلسة مطلوب', 400);
  }

  const sanitized = sanitizeSessionName(sessionName);
  if (!sanitized) {
    return errorResponse('اسم الجلسة غير صالح', 400);
  }

  // Verify ownership
  if (requireActive) {
    const result = await verifySessionActive(sanitized, userId, isAdmin);
    if (!result.success) {
      return errorResponse(result.error || 'خطأ في التحقق من الجلسة', result.statusCode || 400);
    }
  } else {
    const result = await verifySessionOwnership(sanitized, userId, isAdmin);
    if (!result.success) {
      return errorResponse(result.error || 'خطأ في التحقق من الجلسة', result.statusCode || 400);
    }
  }

  return null; // No error, continue
}

/**
 * Extract sessionName from request params or query
 */
export function extractSessionName(
  params?: { sessionName?: string },
  searchParams?: URLSearchParams
): string | null {
  if (params?.sessionName) {
    return params.sessionName;
  }
  if (searchParams?.get('sessionName')) {
    return searchParams.get('sessionName');
  }
  return null;
}

