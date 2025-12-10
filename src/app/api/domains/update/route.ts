/**
 * Update Domain Assignment API
 * 
 * POST /api/domains/update
 * 
 * Admin: Can update any assignment including user reassignment
 * User: Can only update their own assignments (revShare, notes)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userIsAdmin = isAdmin((session.user as { role?: string }).role);
    const body = await request.json();
    const { id, revShare, isActive, notes, userId, domain, network } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Get the existing assignment
    const existing = await prisma.domain_Assignment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Non-admin users can only update their own assignments
    if (!userIsAdmin && existing.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own assignments" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: {
      revShare?: number;
      isActive?: boolean;
      notes?: string;
      userId?: string;
    } = {};

    if (revShare !== undefined) {
      const newRevShare = parseFloat(revShare);
      if (isNaN(newRevShare) || newRevShare < 0 || newRevShare > 100) {
        return NextResponse.json(
          { success: false, error: "RevShare must be between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.revShare = newRevShare;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Only admin can reassign to a different user
    if (userId !== undefined && userId !== existing.userId) {
      if (!userIsAdmin) {
        return NextResponse.json(
          { success: false, error: "Only admins can reassign domains" },
          { status: 403 }
        );
      }

      // Verify the target user exists and is active
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "Target user not found" },
          { status: 404 }
        );
      }

      if (!targetUser.isActive) {
        return NextResponse.json(
          { success: false, error: "Cannot assign to inactive user" },
          { status: 400 }
        );
      }

      updateData.userId = userId;
    }

    // Update the assignment
    const updated = await prisma.domain_Assignment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully",
      assignment: {
        id: updated.id,
        domain: updated.domain,
        network: updated.network,
        revShare: updated.revShare,
        isActive: updated.isActive,
        userId: updated.userId,
        userName: updated.user.name,
        userEmail: updated.user.email,
      },
    });
  } catch (error) {
    console.error("[Domain Update] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
