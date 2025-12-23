/**
 * Input Validation Middleware
 * Middleware for validating and sanitizing request inputs
 */

import { NextResponse } from "next/server";
import {
  sanitizeSessionName,
  sanitizePhoneNumber,
  sanitizePhoneNumbers,
  sanitizeMessage,
  sanitizeTitle,
  validateObjectId,
  sanitizeLimit,
} from "@/lib/utils/validation.util";
import { errorResponse } from "@/lib/utils/api.util";

export interface ValidationResult<T = any> {
  isValid: boolean;
  error?: NextResponse;
  data?: T;
}

/**
 * Validate and sanitize session name from params
 */
export function validateSessionNameParam(
  sessionName: string | undefined | null
): ValidationResult<string> {
  if (!sessionName) {
    return {
      isValid: false,
      error: errorResponse('اسم الجلسة مطلوب', 400),
    };
  }

  const sanitized = sanitizeSessionName(sessionName);
  if (!sanitized) {
    return {
      isValid: false,
      error: errorResponse('اسم الجلسة غير صالح', 400),
    };
  }

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Validate and sanitize phone number
 */
export function validatePhoneNumber(
  phoneNumber: any
): ValidationResult<string> {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) {
    return {
      isValid: false,
      error: errorResponse('رقم الهاتف غير صالح', 400),
    };
  }

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Validate and sanitize phone numbers array
 */
export function validatePhoneNumbers(
  phoneNumbers: any
): ValidationResult<string[]> {
  const sanitized = sanitizePhoneNumbers(phoneNumbers);
  if (!sanitized) {
    return {
      isValid: false,
      error: errorResponse('يجب تحديد أرقام هواتف صحيحة', 400),
    };
  }

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Validate and sanitize message
 */
export function validateMessage(
  message: any,
  maxLength: number = 4096
): ValidationResult<string> {
  const sanitized = sanitizeMessage(message, maxLength);
  if (!sanitized) {
    return {
      isValid: false,
      error: errorResponse(
        `نص الرسالة مطلوب أو طويل جداً (الحد الأقصى ${maxLength} حرف)`,
        400
      ),
    };
  }

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Validate and sanitize title
 */
export function validateTitle(
  title: any,
  maxLength: number = 200
): ValidationResult<string> {
  const sanitized = sanitizeTitle(title, maxLength);
  if (!sanitized) {
    return {
      isValid: false,
      error: errorResponse(
        `عنوان الحملة مطلوب أو طويل جداً (الحد الأقصى ${maxLength} حرف)`,
        400
      ),
    };
  }

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Validate ObjectId
 */
export function validateIdParam(
  id: string | undefined | null,
  resourceName: string = 'المورد'
): ValidationResult<string> {
  if (!id) {
    return {
      isValid: false,
      error: errorResponse(`معرف ${resourceName} مطلوب`, 400),
    };
  }

  if (!validateObjectId(id)) {
    return {
      isValid: false,
      error: errorResponse(`معرف ${resourceName} غير صالح`, 400),
    };
  }

  return {
    isValid: true,
    data: id,
  };
}

/**
 * Validate status parameter
 */
export function validateStatusParam(
  status: string | null,
  allowedStatuses: string[]
): ValidationResult<string> {
  if (!status) {
    return {
      isValid: false,
      error: errorResponse('يجب تحديد الحالة', 400),
    };
  }

  if (!allowedStatuses.includes(status)) {
    return {
      isValid: false,
      error: errorResponse(
        `الحالة غير صالحة. يجب أن تكون واحدة من: ${allowedStatuses.join(', ')}`,
        400
      ),
    };
  }

  return {
    isValid: true,
    data: status,
  };
}

/**
 * Validate limit parameter
 */
export function validateLimitParam(
  limit: string | null,
  min: number = 1,
  max: number = 100,
  defaultValue: number = 50
): ValidationResult<number> {
  const sanitized = sanitizeLimit(limit, min, max, defaultValue);
  return {
    isValid: true,
    data: sanitized,
  };
}

