/**
 * Update Domain Assignment API
 * 
 * POST /api/domains/update
 * 
 * Updates revShare or other settings for a domain assignment.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const body = await request.json();
    const { id, revShare, isActive, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Verify the assignment belongs to this user
    const existing = await prisma.domain_Assignment.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      revShare?: number;
      isActive?: boolean;
      notes?: string;
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

    // Update the assignment
    const updated = await prisma.domain_Assignment.update({
      where: { id },
      data: updateData,
    });

    console.log(`[Domain Update] Updated ${updated.domain}: revShare=${updated.revShare}`);

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully",
      assignment: {
        id: updated.id,
        domain: updated.domain,
        network: updated.network,
        revShare: updated.revShare,
        isActive: updated.isActive,
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

