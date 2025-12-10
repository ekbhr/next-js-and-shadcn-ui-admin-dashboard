import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getPasswordResetEmailTemplate } from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        { message: "If that email exists, we've sent a reset link." },
        { status: 200 },
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expires,
      },
    });

    // Generate reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      const emailHtml = getPasswordResetEmailTemplate(resetUrl, user.name || undefined);
      
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password - RevEngine Media",
        html: emailHtml,
      });
    } catch (emailError) {
      // Log error but don't fail the request (security: don't reveal if email failed)
      console.error("Failed to send password reset email:", emailError);
      // Continue - we still return success to prevent email enumeration
    }

    return NextResponse.json(
      { message: "If that email exists, we've sent a reset link." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

