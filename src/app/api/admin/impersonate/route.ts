/**
 * Admin Impersonation API
 * 
 * POST /api/admin/impersonate - Start impersonating a user
 * 
 * Allows admins to view the dashboard as another user.
 * Stores impersonation state in a secure cookie.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

const IMPERSONATION_COOKIE = "impersonation";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can impersonate
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Only admins can impersonate users" },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Can't impersonate yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot impersonate yourself" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Store impersonation data in cookie
    const impersonationData = {
      adminId: session.user.id,
      adminEmail: session.user.email,
      adminName: session.user.name,
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      targetUserName: targetUser.name,
      targetUserRole: targetUser.role,
      startedAt: new Date().toISOString(),
    };

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(impersonationData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.email}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    });
  } catch (error) {
    console.error("[Impersonate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to impersonate" },
      { status: 500 }
    );
  }
}

// GET endpoint to check impersonation status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (!impersonationCookie?.value) {
      return NextResponse.json({
        isImpersonating: false,
      });
    }

    const data = JSON.parse(impersonationCookie.value);

    return NextResponse.json({
      isImpersonating: true,
      admin: {
        id: data.adminId,
        email: data.adminEmail,
        name: data.adminName,
      },
      targetUser: {
        id: data.targetUserId,
        email: data.targetUserEmail,
        name: data.targetUserName,
      },
      startedAt: data.startedAt,
    });
  } catch (error) {
    console.error("[Impersonate Status] Error:", error);
    return NextResponse.json({
      isImpersonating: false,
    });
  }
}

// DELETE endpoint to stop impersonation
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);

    return NextResponse.json({
      success: true,
      message: "Impersonation ended",
    });
  } catch (error) {
    console.error("[Stop Impersonate] Error:", error);
    return NextResponse.json(
      { error: "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}

