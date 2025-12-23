/**
 * Resource Ownership Middleware
 * Middleware to verify resource ownership (campaigns, jobs, etc.)
 */

import { NextResponse } from "next/server";
import { verifyCampaignOwnership, verifyJobOwnership } from "@/lib/utils/ownership.util";
import { validateObjectId } from "@/lib/utils/validation.util";
import { errorResponse } from "@/lib/utils/api.util";

/**
 * Middleware to verify campaign ownership
 */
export async function requireCampaignOwnership(
  campaignId: string | undefined | null,
  userId: string | any
): Promise<{ response?: NextResponse; campaign?: any }> {
  if (!campaignId) {
    return { response: errorResponse('معرف الحملة مطلوب', 400) };
  }

  if (!validateObjectId(campaignId)) {
    return { response: errorResponse('معرف الحملة غير صالح', 400) };
  }

  const result = await verifyCampaignOwnership(campaignId, userId);
  
  if (!result.success) {
    return { response: errorResponse(result.error || 'خطأ في التحقق من الحملة', result.statusCode || 400) };
  }

  return { campaign: result.campaign };
}

/**
 * Middleware to verify job ownership
 */
export async function requireJobOwnership(
  jobId: string | undefined | null,
  userId: string | any
): Promise<{ response?: NextResponse; job?: any }> {
  if (!jobId) {
    return { response: errorResponse('معرف العملية مطلوب', 400) };
  }

  if (!validateObjectId(jobId)) {
    return { response: errorResponse('معرف العملية غير صالح', 400) };
  }

  const result = await verifyJobOwnership(jobId, userId);
  
  if (!result.success) {
    return { response: errorResponse(result.error || 'خطأ في التحقق من العملية', result.statusCode || 400) };
  }

  return { job: result.job };
}

