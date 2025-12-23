/**
 * Ownership Utilities
 * Helper functions for verifying resource ownership
 */

import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import Campaign from "@/models/Campaign";
import BulkSendJob from "@/models/BulkSendJob";
import Message from "@/models/Message";
import { toObjectId, validateObjectId } from "./validation.util";

export interface OwnershipResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Verify session belongs to user
 * @param sessionName - Session name to verify
 * @param userId - User ID to check ownership
 * @param isAdmin - Optional: whether user is admin (default: false). If true, allows access to default sessions.
 */
export async function verifySessionOwnership(
  sessionName: string,
  userId: string | mongoose.Types.ObjectId,
  isAdmin: boolean = false
): Promise<OwnershipResult> {
  try {
    await connectDB();

    const sanitizedSessionName = sessionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!sanitizedSessionName || sanitizedSessionName !== sessionName.trim().toLowerCase()) {
      return {
        success: false,
        error: 'اسم الجلسة غير صالح',
        statusCode: 400,
      };
    }

    // For admin: allow access to default sessions from all users
    // For non-admin: only allow access to their own sessions
    let sessionDoc;
    if (isAdmin) {
      // Admin can access their own sessions OR any default session
      sessionDoc = await Session.findOne({
        sessionName: sanitizedSessionName,
        $or: [
          { userId: toObjectId(userId) },
          { isDefault: true }
        ]
      });
    } else {
      // Non-admin: only their own sessions
      sessionDoc = await Session.findOne({
        sessionName: sanitizedSessionName,
        userId: toObjectId(userId),
      });
    }

    if (!sessionDoc) {
      return {
        success: false,
        error: 'الجلسة غير موجودة أو ليس لديك صلاحية للوصول إليها',
        statusCode: 404,
      };
    }

    // Non-admin users cannot use default sessions directly
    if (sessionDoc.isDefault && !isAdmin) {
      return {
        success: false,
        error: 'لا يمكن استخدام الجلسات الافتراضية مباشرة',
        statusCode: 403,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: 'خطأ في التحقق من ملكية الجلسة',
      statusCode: 500,
    };
  }
}

/**
 * Verify campaign belongs to user
 */
export async function verifyCampaignOwnership(
  campaignId: string,
  userId: string | mongoose.Types.ObjectId
): Promise<OwnershipResult & { campaign?: any }> {
  try {
    await connectDB();

    if (!validateObjectId(campaignId)) {
      return {
        success: false,
        error: 'معرف الحملة غير صالح',
        statusCode: 400,
      };
    }

    const campaign = await Campaign.findOne({
      _id: toObjectId(campaignId),
      userId: toObjectId(userId),
    });

    if (!campaign) {
      return {
        success: false,
        error: 'الحملة غير موجودة أو ليس لديك صلاحية للوصول إليها',
        statusCode: 404,
      };
    }

    return { success: true, campaign };
  } catch (error: any) {
    return {
      success: false,
      error: 'خطأ في التحقق من ملكية الحملة',
      statusCode: 500,
    };
  }
}

/**
 * Verify bulk send job belongs to user
 */
export async function verifyJobOwnership(
  jobId: string,
  userId: string | mongoose.Types.ObjectId
): Promise<OwnershipResult & { job?: any }> {
  try {
    await connectDB();

    if (!validateObjectId(jobId)) {
      return {
        success: false,
        error: 'معرف العملية غير صالح',
        statusCode: 400,
      };
    }

    const job = await BulkSendJob.findOne({
      _id: toObjectId(jobId),
      userId: toObjectId(userId),
    });

    if (!job) {
      return {
        success: false,
        error: 'العملية غير موجودة أو ليس لديك صلاحية للوصول إليها',
        statusCode: 404,
      };
    }

    return { success: true, job };
  } catch (error: any) {
    return {
      success: false,
      error: 'خطأ في التحقق من ملكية العملية',
      statusCode: 500,
    };
  }
}

/**
 * Verify message belongs to user (optional sessionName check)
 * @param userId - User ID to check ownership
 * @param sessionName - Optional session name to verify
 * @param isAdmin - Optional: whether user is admin (default: false). If true, allows access to default sessions.
 */
export async function verifyMessageOwnership(
  userId: string | mongoose.Types.ObjectId,
  sessionName?: string,
  isAdmin: boolean = false
): Promise<OwnershipResult> {
  try {
    await connectDB();

    // If sessionName is provided, verify it belongs to user
    if (sessionName) {
      const sessionResult = await verifySessionOwnership(sessionName, userId, isAdmin);
      if (!sessionResult.success) {
        return sessionResult;
      }
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: 'خطأ في التحقق من ملكية الرسالة',
      statusCode: 500,
    };
  }
}

/**
 * Verify session is active
 * @param sessionName - Session name to verify
 * @param userId - User ID to check ownership
 * @param isAdmin - Optional: whether user is admin (default: false). If true, allows access to default sessions.
 */
export async function verifySessionActive(
  sessionName: string,
  userId: string | mongoose.Types.ObjectId,
  isAdmin: boolean = false
): Promise<OwnershipResult & { session?: any }> {
  const ownershipResult = await verifySessionOwnership(sessionName, userId, isAdmin);
  
  if (!ownershipResult.success) {
    return ownershipResult;
  }

  try {
    await connectDB();

    const sanitizedSessionName = sessionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // For admin: allow access to default sessions from all users
    // For non-admin: only allow access to their own sessions
    let sessionDoc;
    if (isAdmin) {
      // Admin can access their own sessions OR any default session
      sessionDoc = await Session.findOne({
        sessionName: sanitizedSessionName,
        $or: [
          { userId: toObjectId(userId) },
          { isDefault: true }
        ]
      });
    } else {
      // Non-admin: only their own sessions
      sessionDoc = await Session.findOne({
        sessionName: sanitizedSessionName,
        userId: toObjectId(userId),
      });
    }

    if (!sessionDoc) {
      return {
        success: false,
        error: 'الجلسة غير موجودة',
        statusCode: 404,
      };
    }

    if (sessionDoc.status === 'terminated') {
      return {
        success: false,
        error: 'الجلسة منتهية',
        statusCode: 400,
      };
    }

    if (sessionDoc.status !== 'active') {
      return {
        success: false,
        error: 'الجلسة غير نشطة',
        statusCode: 400,
      };
    }

    return { success: true, session: sessionDoc };
  } catch (error: any) {
    return {
      success: false,
      error: 'خطأ في التحقق من حالة الجلسة',
      statusCode: 500,
    };
  }
}

