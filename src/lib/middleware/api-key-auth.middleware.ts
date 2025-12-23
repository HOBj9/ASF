/**
 * API Key Authentication Middleware
 * Middleware for authenticating requests using API keys
 */

import { NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/api-key.service';
import { errorResponse } from '@/lib/utils/api.util';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role';
import { hasPermission } from '@/lib/permissions';

const apiKeyService = new ApiKeyService();

export interface ApiKeyContext {
  user: any;
  userId: string;
  userApiKey: any;
}

/**
 * Require API key authentication
 * Validates API key from X-API-Key header
 */
export async function requireApiKey(request: Request): Promise<ApiKeyContext | NextResponse> {
  // Get API key from header
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');

  if (!apiKey) {
    return errorResponse('API key مطلوب. يرجى إضافة X-API-Key في header', 401);
  }

  // Validate API key and get user
  const result = await apiKeyService.getUserFromApiKey(apiKey);

  if (!result) {
    return errorResponse('API key غير صحيح أو المستخدم غير نشط', 401);
  }

  const { user, userApiKey } = result;

  // Check if user has permission to send messages
  await connectDB();
  const userWithRole = await User.findById(user._id).populate('role').lean();
  if (!userWithRole) {
    return errorResponse('المستخدم غير موجود', 401);
  }

  const role = await Role.findById(userWithRole.role).populate('permissions').lean();
  if (!role || !hasPermission(role as any, 'messages', 'create')) {
    return errorResponse('ليس لديك صلاحية لإرسال الرسائل', 403);
  }

  // Update last used timestamp
  await apiKeyService.updateLastUsed(user._id.toString());

  return {
    user: userWithRole,
    userId: user._id.toString(),
    userApiKey,
  };
}

/**
 * Validate API key (without updating last used)
 */
export async function validateApiKey(apiKey: string): Promise<{ user: any; userApiKey: any } | null> {
  return await apiKeyService.getUserFromApiKey(apiKey);
}

/**
 * Get user from API key
 */
export async function getUserFromApiKey(apiKey: string): Promise<{ user: any; userApiKey: any } | null> {
  return await apiKeyService.getUserFromApiKey(apiKey);
}

