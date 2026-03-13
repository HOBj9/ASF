/**
 * Route Handler Utilities
 * Reusable route handler functions with built-in validation and error handling
 */

import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/middleware/api-auth.middleware";
import { requireSessionOwnership } from "@/lib/middleware/session-ownership.middleware";
import { validateSessionNameParam, validateIdParam, validateStatusParam, validateLimitParam } from "@/lib/middleware/input-validation.middleware";
import { requireCampaignOwnership, requireJobOwnership } from "@/lib/middleware/resource-ownership.middleware";
import { toObjectId } from "./validation.util";
import { successResponse, errorResponse } from "./api.util";

export interface RouteContext {
  session: any;
  role?: any;
  params?: Record<string, any>;
  searchParams?: URLSearchParams;
  body?: any;
}

export interface RouteHandlerOptions {
  permission?: {
    resource: string;
    action: string;
  };
  validateSessionName?: {
    from?: 'params' | 'query' | 'body';
    paramName?: string;
    requireActive?: boolean;
  };
  validateId?: {
    from?: 'params' | 'query';
    paramName?: string;
    resourceName?: string;
    verifyOwnership?: 'campaign' | 'job';
  };
  validateStatus?: {
    allowedStatuses: string[];
  };
  validateLimit?: {
    min?: number;
    max?: number;
    defaultValue?: number;
  };
}

export type RouteHandler<T = any> = (
  context: RouteContext
) => Promise<NextResponse | T>;

/**
 * Standard GET handler with built-in validation
 */
export async function handleGet<T = any>(
  request: Request,
  params: Record<string, string> | undefined,
  handler: RouteHandler<T>,
  options: RouteHandlerOptions = {}
): Promise<NextResponse> {
  try {
    // Authentication
    let authResult;
    if (options.permission) {
      authResult = await requirePermission(
        options.permission.resource,
        options.permission.action
      );
    } else {
      // Default to read permission
      authResult = await requirePermission('messages', 'read');
    }
    
    if (authResult instanceof NextResponse) return authResult;
    const { session, role } = authResult;
    const searchParams = new URL(request.url).searchParams;

    // Check if user is admin
    const { isAdmin } = await import('@/lib/permissions');
    const userIsAdmin = isAdmin(role);

    // Build context
    const context: RouteContext = {
      session,
      role,
      params,
      searchParams,
    };

    // Validate session name if required
    if (options.validateSessionName) {
      const source = options.validateSessionName.from || 'query';
      const paramName = options.validateSessionName.paramName || 'sessionName';
      
      let sessionName: string | null = null;
      if (source === 'params') {
        sessionName = params?.[paramName] || null;
      } else if (source === 'query') {
        sessionName = searchParams.get(paramName);
      } else if (source === 'body') {
        sessionName = null; // Body not available in GET
      }

      const validation = validateSessionNameParam(sessionName);
      if (!validation.isValid) {
        return validation.error!;
      }

      const ownershipError = await requireSessionOwnership(
        validation.data!,
        session.user.id,
        options.validateSessionName.requireActive || false,
        userIsAdmin
      );
      if (ownershipError) return ownershipError;

      context.params = { ...context.params, [paramName]: validation.data! };
    }

    // Validate ID if required
    if (options.validateId) {
      const source = options.validateId.from || 'params';
      const paramName = options.validateId.paramName || 'id';
      const resourceName = options.validateId.resourceName || 'المورد';

      const id = source === 'params'
        ? params?.[paramName]
        : searchParams.get(paramName);

      const validation = validateIdParam(id, resourceName);
      if (!validation.isValid) {
        return validation.error!;
      }

      // Verify ownership if required
      if (options.validateId.verifyOwnership === 'campaign') {
        const ownershipResult = await requireCampaignOwnership(
          validation.data!,
          session.user.id
        );
        if (ownershipResult.response) {
          return ownershipResult.response;
        }
        context.params = { ...context.params, campaign: ownershipResult.campaign };
      } else if (options.validateId.verifyOwnership === 'job') {
        const ownershipResult = await requireJobOwnership(
          validation.data!,
          session.user.id
        );
        if (ownershipResult.response) {
          return ownershipResult.response;
        }
        context.params = { ...context.params, job: ownershipResult.job };
      }

      context.params = { ...context.params, [paramName]: validation.data! };
    }

    // Validate status if required
    if (options.validateStatus) {
      const status = searchParams.get('status');
      const validation = validateStatusParam(status, options.validateStatus.allowedStatuses);
      if (!validation.isValid) {
        return validation.error!;
      }
      context.params = { ...context.params, status: validation.data! };
    }

    // Validate limit if required
    if (options.validateLimit) {
      const limit = searchParams.get('limit');
      const validation = validateLimitParam(
        limit,
        options.validateLimit.min,
        options.validateLimit.max,
        options.validateLimit.defaultValue
      );
      context.params = { ...context.params, limit: validation.data! };
    }

    // Execute handler
    const result = await handler(context);

    // If handler returns NextResponse, return it directly
    if (result instanceof NextResponse) {
      return result;
    }

    // Otherwise, wrap in success response
    return successResponse(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * Standard POST handler with built-in validation
 */
export async function handlePost<T = any>(
  request: Request,
  params: Record<string, string> | undefined,
  handler: RouteHandler<T>,
  options: RouteHandlerOptions = {}
): Promise<NextResponse> {
  try {
    // Authentication
    let authResult;
    if (options.permission) {
      authResult = await requirePermission(
        options.permission.resource,
        options.permission.action
      );
    } else {
      // Default to create permission
      authResult = await requirePermission('messages', 'create');
    }
    
    if (authResult instanceof NextResponse) return authResult;
    const { session, role } = authResult;
    const body = await request.json();
    const searchParams = new URL(request.url).searchParams;

    // Check if user is admin
    const { isAdmin } = await import('@/lib/permissions');
    const userIsAdmin = isAdmin(role);

    // Build context
    const context: RouteContext = {
      session,
      role,
      params,
      searchParams,
      body,
    };

    // Validate session name if required
    if (options.validateSessionName) {
      const source = options.validateSessionName.from || 'params';
      const paramName = options.validateSessionName.paramName || 'sessionName';
      
      const sessionName = source === 'params' 
        ? params?.[paramName]
        : (body?.[paramName] || searchParams.get(paramName));

      const validation = validateSessionNameParam(sessionName);
      if (!validation.isValid) {
        return validation.error!;
      }

      const ownershipError = await requireSessionOwnership(
        validation.data!,
        session.user.id,
        options.validateSessionName.requireActive || false,
        userIsAdmin
      );
      if (ownershipError) return ownershipError;

      context.params = { ...context.params, [paramName]: validation.data! };
    }

    // Validate ID if required
    if (options.validateId) {
      const source = options.validateId.from || 'params';
      const paramName = options.validateId.paramName || 'id';
      const resourceName = options.validateId.resourceName || 'المورد';

      const id = source === 'params'
        ? params?.[paramName]
        : (body?.[paramName] || searchParams.get(paramName));

      const validation = validateIdParam(id, resourceName);
      if (!validation.isValid) {
        return validation.error!;
      }

      // Verify ownership if required
      if (options.validateId.verifyOwnership === 'campaign') {
        const ownershipResult = await requireCampaignOwnership(
          validation.data!,
          session.user.id
        );
        if (ownershipResult.response) {
          return ownershipResult.response;
        }
        context.params = { ...context.params, campaign: ownershipResult.campaign };
      } else if (options.validateId.verifyOwnership === 'job') {
        const ownershipResult = await requireJobOwnership(
          validation.data!,
          session.user.id
        );
        if (ownershipResult.response) {
          return ownershipResult.response;
        }
        context.params = { ...context.params, job: ownershipResult.job };
      }

      context.params = { ...context.params, [paramName]: validation.data! };
    }

    // Execute handler
    const result = await handler(context);

    // If handler returns NextResponse, return it directly
    if (result instanceof NextResponse) {
      return result;
    }

    // Otherwise, wrap in success response
    return successResponse(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * Standard PATCH handler with built-in validation
 */
export async function handlePatch<T = any>(
  request: Request,
  params: Record<string, string> | undefined,
  handler: RouteHandler<T>,
  options: RouteHandlerOptions = {}
): Promise<NextResponse> {
  return handlePost(request, params, handler, {
    ...options,
    permission: options.permission || { resource: 'messages', action: 'update' },
  });
}

/**
 * Standard DELETE handler with built-in validation
 */
export async function handleDelete<T = any>(
  request: Request,
  params: Record<string, string> | undefined,
  handler: RouteHandler<T>,
  options: RouteHandlerOptions = {}
): Promise<NextResponse> {
  return handlePost(request, params, handler, {
    ...options,
    permission: options.permission || { resource: 'messages', action: 'delete' },
  });
}

