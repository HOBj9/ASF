import { NextResponse } from "next/server";
import { requireAdmin, requireAuth, handleApiError } from "@/lib/middleware/api-auth.middleware";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/utils/api.util";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/admin/impersonate - Impersonate a user (admin only)
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse('معرف المستخدم مطلوب', 400);
    }

    await connectDB();

    // Get the user to impersonate
    const targetUser = await User.findById(userId).populate('role').lean();

    if (!targetUser) {
      return errorResponse('المستخدم غير موجود', 404);
    }

    // Return user data with original admin info
    return successResponse({
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        avatar: targetUser.avatar || null,
        originalAdminId: session.user.id,
        originalAdminName: session.user.name,
        originalAdminEmail: session.user.email,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/stop-impersonate - Stop impersonating and return to admin account
 */
export async function DELETE() {
  try {
    // Use requireAuth instead of requireAdmin because we're impersonating a non-admin user
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;

    // Check if user is impersonating (has originalAdminId)
    if (!session?.user || !('originalAdminId' in session.user) || !session.user.originalAdminId) {
      return errorResponse('لا توجد جلسة تقليد نشطة', 400);
    }

    await connectDB();

    // Get the original admin user
    const adminUser = await User.findById(session.user.originalAdminId).populate('role').lean();

    if (!adminUser) {
      return errorResponse('حساب المدير غير موجود', 404);
    }

    // Return admin user data
    return successResponse({
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        avatar: adminUser.avatar || null,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

