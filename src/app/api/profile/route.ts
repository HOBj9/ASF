export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/api-auth.middleware";
import { handleApiError, successResponse } from "@/lib/utils/api.util";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

/**
 * GET /api/profile - Get current user profile
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    await connectDB();

    const user = await User.findById(session.user.id)
      .select("-password")
      .populate("role")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return successResponse({ user });
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/profile - Update current user profile
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { session } = authResult;
    await connectDB();

    const body = await request.json();
    const { name, email, password, avatar, businessName } = body;

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Update name
    if (name !== undefined) {
      user.name = name;
    }

    // Update email (check if it's unique)
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم بالفعل" },
          { status: 400 }
        );
      }
      user.email = email;
    }

    // Update password
    if (password !== undefined && password.trim() !== "") {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
          { status: 400 }
        );
      }
      user.password = await bcrypt.hash(password, 10);
    }

    // Update avatar (can be null to remove it)
    if (avatar !== undefined) {
      // Only update if avatar is different from current
      if (avatar !== user.avatar) {
        user.avatar = avatar || null;
      }
    }

    // Update business name
    if (businessName !== undefined) {
      user.businessName = businessName || null;
    }

    await user.save();

    // Verify the save was successful
    const savedUser = await User.findById(user._id).select("avatar").lean();
    if (avatar !== undefined && savedUser?.avatar !== avatar) {
      console.error("Avatar save verification failed", {
        expected: avatar ? "base64 string" : null,
        actual: savedUser?.avatar ? "base64 string" : null
      });
    }

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("role")
      .lean();

    return successResponse({
      user: updatedUser,
      message: "تم تحديث البيانات بنجاح",
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

