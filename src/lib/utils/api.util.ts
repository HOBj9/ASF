/**
 * API Utilities
 * Helper functions for API responses and error handling
 */

import { NextResponse } from 'next/server';
import { messages } from '@/constants/messages';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || messages.common.success,
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  error: string
): NextResponse<ApiResponse> {
  return errorResponse(error, 400);
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return errorResponse(messages.errors.unauthorized, 401);
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(): NextResponse<ApiResponse> {
  return errorResponse(messages.errors.forbidden, 403);
}

/**
 * Create a not found response
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse<ApiResponse> {
  return errorResponse(messages.errors.notFound, 404);
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse(messages.errors.server, 500);
}

