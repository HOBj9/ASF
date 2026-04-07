import { NextResponse } from 'next/server';

export interface MobileApiErrorPayload {
  message: string;
  code: string;
  status: number;
}

export class MobileApiError extends Error {
  code: string;
  status: number;

  constructor(payload: MobileApiErrorPayload) {
    super(payload.message);
    this.name = 'MobileApiError';
    this.code = payload.code;
    this.status = payload.status;
  }
}

export function createMobileApiError(
  message: string,
  code: string,
  status: number
): MobileApiError {
  return new MobileApiError({ message, code, status });
}

export function mobileErrorResponse(
  message: string,
  code: string,
  status: number
): NextResponse<MobileApiErrorPayload> {
  return NextResponse.json(
    {
      message,
      code,
      status,
    },
    { status }
  );
}

export function handleMobileApiError(error: unknown): NextResponse<MobileApiErrorPayload> {
  console.error('Mobile API Error:', error);

  if (error instanceof Error && error.message === 'Invalid or expired mobile auth token') {
    return mobileErrorResponse(
      'رمز دخول الموبايل غير صالح أو منتهي الصلاحية',
      'MOBILE_AUTH_TOKEN_INVALID',
      401
    );
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error &&
    'status' in error
  ) {
    const status = Number((error as { status?: unknown }).status);

    return mobileErrorResponse(
      String((error as { message: unknown }).message),
      String((error as { code: unknown }).code),
      Number.isInteger(status) ? status : 500
    );
  }

  return mobileErrorResponse('حدث خطأ غير متوقع في الخادم', 'INTERNAL_SERVER_ERROR', 500);
}
