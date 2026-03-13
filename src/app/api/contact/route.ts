export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContactSubmission from "@/models/ContactSubmission";

const VALID_INQUIRY_TYPES = new Set(["web_inquiry", "project_inquiry", "other"]);

function isNonEmptyString(value: unknown, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      inquiryType,
      expectedDailyMessages,
      message,
    } = body ?? {};

    if (
      !isNonEmptyString(name, 2) ||
      !isNonEmptyString(email, 3) ||
      !isNonEmptyString(expectedDailyMessages, 1) ||
      !isNonEmptyString(message, 10) ||
      !VALID_INQUIRY_TYPES.has(inquiryType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "البريد الإلكتروني غير صالح.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    await ContactSubmission.create({
      name: name.trim(),
      email: normalizedEmail,
      inquiryType,
      expectedDailyMessages: expectedDailyMessages.trim(),
      message: message.trim(),
      status: "new",
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال رسالتك بنجاح. سنتواصل معك قريبًا.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Contact submission error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.",
      },
      { status: 500 },
    );
  }
}
