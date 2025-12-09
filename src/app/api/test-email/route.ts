import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getPasswordResetEmailTemplate } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    // Generate a test reset URL
    const testResetUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=test-token-12345`;

    // Get email template
    const emailHtml = getPasswordResetEmailTemplate(testResetUrl, "Test User");

    // Send test email
    const result = await sendEmail({
      to: email,
      subject: "Test Email - EKBHR Reporting Dashboard",
      html: emailHtml,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Test email sent successfully",
        emailId: result.id,
        mode: process.env.RESEND_API_KEY ? "production" : "development (console only)",
        details: {
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: email,
          hasApiKey: !!process.env.RESEND_API_KEY,
          apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) + "...",
        },
        result: result.result || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: 500 },
    );
  }
}

