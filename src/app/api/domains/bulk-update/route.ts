/**
 * Bulk Domain Update API Endpoint
 * 
 * POST /api/domains/bulk-update
 * 
 * Updates multiple domain assignments at once (user assignment and revShare).
 * Admin only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin only
    if (!isAdmin((session.user as { role?: string }).role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, userId, revShare } = body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No domains selected" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (typeof revShare !== "number" || revShare < 0 || revShare > 100) {
      return NextResponse.json(
        { success: false, error: "RevShare must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`[Bulk Update] Updating ${ids.length} domains to user ${user.email} with ${revShare}% revShare`);

    // Update all selected assignments
    const result = await prisma.domain_Assignment.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        userId: userId,
        revShare: revShare,
        updatedAt: new Date(),
      },
    });

    console.log(`[Bulk Update] Updated ${result.count} domain assignments`);

    return NextResponse.json({
      success: true,
      message: `Updated ${result.count} domain assignments`,
      updated: result.count,
      assignedTo: user.email,
      revShare: revShare,
    });
  } catch (error) {
    console.error("[Bulk Update] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

