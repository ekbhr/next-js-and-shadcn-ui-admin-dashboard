/**
 * Temporary endpoint to set user role
 * DELETE THIS FILE AFTER USE
 * 
 * GET /api/admin/set-role?email=xxx&role=admin
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const role = searchParams.get("role") || "admin";
  const secret = searchParams.get("secret");

  // Basic protection - require a secret
  if (secret !== "temp-setup-2024") {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} is now ${user.role}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

