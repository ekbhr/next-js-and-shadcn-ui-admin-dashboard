/**
 * Admin Domain Management API
 * 
 * GET /api/admin/domains
 * Returns all domain assignments across all users (admin only)
 * 
 * POST /api/admin/domains
 * Assign a domain to a user
 * 
 * DELETE /api/admin/domains
 * Remove a domain assignment from a user
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function GET() {
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

    // Get all domain assignments with user info
    const assignments = await prisma.domain_Assignment.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [{ domain: "asc" }, { network: "asc" }],
    });

    // Get unique domains (from all assignments)
    const uniqueDomains = [...new Set(assignments.map((a) => a.domain).filter(Boolean))];

    // Group assignments by domain
    const domainMap = new Map<string, {
      domain: string;
      network: string;
      assignments: Array<{
        id: string;
        userId: string;
        userEmail: string;
        userName: string | null;
        revShare: number;
      }>;
    }>();

    for (const assignment of assignments) {
      if (!assignment.domain) continue;

      const key = `${assignment.domain}_${assignment.network}`;
      if (!domainMap.has(key)) {
        domainMap.set(key, {
          domain: assignment.domain,
          network: assignment.network || "sedo",
          assignments: [],
        });
      }

      domainMap.get(key)!.assignments.push({
        id: assignment.id,
        userId: assignment.userId,
        userEmail: assignment.user.email,
        userName: assignment.user.name,
        revShare: assignment.revShare,
      });
    }

    return NextResponse.json({
      success: true,
      domains: Array.from(domainMap.values()),
      uniqueDomains,
      totalAssignments: assignments.length,
    });
  } catch (error) {
    console.error("[Admin Domains] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

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
    const { userId, domain, network = "sedo", revShare = 80 } = body;

    if (!userId || !domain) {
      return NextResponse.json(
        { success: false, error: "userId and domain are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existing = await prisma.domain_Assignment.findFirst({
      where: { userId, domain, network },
    });

    if (existing) {
      // Update existing
      await prisma.domain_Assignment.update({
        where: { id: existing.id },
        data: { revShare, isActive: true },
      });

      return NextResponse.json({
        success: true,
        message: "Domain assignment updated",
        assignment: { ...existing, revShare },
      });
    }

    // Create new assignment
    const assignment = await prisma.domain_Assignment.create({
      data: {
        userId,
        domain,
        network,
        revShare,
        isActive: true,
        notes: `Assigned by admin`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Domain assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("[Admin Domains] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign domain" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
    const { assignmentId, userId, domain, network = "sedo" } = body;

    // Delete by assignmentId if provided
    if (assignmentId) {
      await prisma.domain_Assignment.delete({
        where: { id: assignmentId },
      });

      return NextResponse.json({
        success: true,
        message: "Domain assignment removed",
      });
    }

    // Otherwise delete by userId + domain + network
    if (!userId || !domain) {
      return NextResponse.json(
        { success: false, error: "assignmentId or (userId and domain) required" },
        { status: 400 }
      );
    }

    const existing = await prisma.domain_Assignment.findFirst({
      where: { userId, domain, network },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.domain_Assignment.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: "Domain assignment removed",
    });
  } catch (error) {
    console.error("[Admin Domains] DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}

