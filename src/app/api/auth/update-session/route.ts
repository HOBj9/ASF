import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/middleware/api-auth.middleware";

/**
 * POST /api/auth/update-session - Update session for impersonation
 */
export async function POST(request: Request) {
  try {
    // Verify user is admin
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { user } = body;

    if (!user) {
      return NextResponse.json(
        { error: 'بيانات المستخدم مطلوبة' },
        { status: 400 }
      );
    }

    // Return success - the client will update the session using next-auth's update method
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'حدث خطأ' },
      { status: 500 }
    );
  }
}

