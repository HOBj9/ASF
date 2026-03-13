export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/api-auth.middleware";

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { user } = body;

    if (!user) {
      return NextResponse.json(
        { error: "بيانات المستخدم مطلوبة" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "حدث خطأ" },
      { status: 500 },
    );
  }
}
