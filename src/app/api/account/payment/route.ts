/**
 * Payment Details API
 * 
 * GET /api/account/payment - Get payment details
 * PUT /api/account/payment - Update payment details
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get payment details
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentDetails = await prisma.paymentDetails.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      paymentDetails,
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    return NextResponse.json(
      { error: "Failed to get payment details" },
      { status: 500 }
    );
  }
}

// Update payment details
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      preferredMethod,
      paypalEmail,
      bankAccountName,
      bankName,
      iban,
      swiftBic,
      bankAddress,
      bankCurrency,
      wiseEmail,
    } = body;

    // Validate preferred method
    const validMethods = ["paypal", "bank", "wise"];
    if (!validMethods.includes(preferredMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (paypalEmail && !emailRegex.test(paypalEmail)) {
      return NextResponse.json(
        { error: "Invalid PayPal email format" },
        { status: 400 }
      );
    }

    if (wiseEmail && !emailRegex.test(wiseEmail)) {
      return NextResponse.json(
        { error: "Invalid Wise email format" },
        { status: 400 }
      );
    }

    // Upsert payment details
    const paymentDetails = await prisma.paymentDetails.upsert({
      where: { userId: session.user.id },
      update: {
        preferredMethod,
        paypalEmail,
        bankAccountName,
        bankName,
        iban,
        swiftBic,
        bankAddress,
        bankCurrency,
        wiseEmail,
      },
      create: {
        userId: session.user.id,
        preferredMethod,
        paypalEmail,
        bankAccountName,
        bankName,
        iban,
        swiftBic,
        bankAddress,
        bankCurrency,
        wiseEmail,
      },
    });

    return NextResponse.json({
      success: true,
      paymentDetails,
    });
  } catch (error) {
    console.error("Update payment details error:", error);
    return NextResponse.json(
      { error: "Failed to update payment details" },
      { status: 500 }
    );
  }
}

