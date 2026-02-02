/**
 * Validation Utilities
 * Helper functions for input validation and sanitization
 */

import mongoose from "mongoose";

/**
 * Sanitize session name - only allow alphanumeric characters
 */
export function sanitizeSessionName(sessionName: string): string | null {
  if (!sessionName || typeof sessionName !== 'string' || sessionName.trim().length === 0) {
    return null;
  }

  const sanitized = sessionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Verify that sanitization didn't remove everything
  if (!sanitized || sanitized !== sessionName.trim().toLowerCase()) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number for general use (allows +)
 */
export function sanitizePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
    return null;
  }

  // Remove any non-digit characters except +
  const sanitized = phoneNumber.trim().replace(/[^\d+]/g, '');
  
  // Phone number should be at least 10 digits
  if (sanitized.length < 10) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number for contacts (digits only, format: 963956888999)
 * Removes all non-digit characters and validates format
 */
export function sanitizeContactPhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
    return null;
  }

  // Remove all non-digit characters (including +, spaces, dashes, etc.)
  const sanitized = phoneNumber.trim().replace(/\D/g, '');
  
  // Phone number should be at least 10 digits and at most 15 digits
  // Format: 963956888999 (country code + number, digits only)
  if (sanitized.length < 10 || sanitized.length > 15) {
    return null;
  }

  // Validate that it contains only digits
  if (!/^\d+$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize phone numbers array
 */
export function sanitizePhoneNumbers(phoneNumbers: any[]): string[] | null {
  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return null;
  }

  const sanitized = phoneNumbers
    .filter((p: any) => p && typeof p === 'string' && p.trim().length > 0)
    .map((p: string) => sanitizePhoneNumber(p))
    .filter((p: string | null): p is string => p !== null);

  if (sanitized.length === 0) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize message content
 */
export function sanitizeMessage(message: string, maxLength: number = 4096): string | null {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return null;
  }

  const sanitized = message.trim();
  
  if (sanitized.length > maxLength) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize title
 */
export function sanitizeTitle(title: string, maxLength: number = 200): string | null {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return null;
  }

  const sanitized = title.trim();
  
  if (sanitized.length > maxLength) {
    return null;
  }

  return sanitized;
}

/**
 * Validate ObjectId format
 */
export function validateObjectId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Convert string to ObjectId safely
 */
export function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Validate status value against allowed values
 */
export function validateStatus(status: string | null, allowedStatuses: string[]): boolean {
  if (!status) {
    return false;
  }
  return allowedStatuses.includes(status);
}

/**
 * Validate and sanitize limit parameter
 */
export function sanitizeLimit(limit: string | null, min: number = 1, max: number = 100, defaultValue: number = 50): number {
  if (!limit) {
    return defaultValue;
  }
  
  const parsed = parseInt(limit);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  return Math.min(Math.max(parsed, min), max);
}
