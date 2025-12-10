/**
 * Admin User Management API
 * 
 * PATCH /api/admin/users/[id]
 * Update user (role, isActive)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { role, isActive } = body;

    // Prevent admin from deactivating themselves
    if (id === session.user.id && isActive === false) {
      return NextResponse.json(
        { success: false, error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    // Prevent admin from removing their own admin role
    if (id === session.user.id && role && role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Cannot remove your own admin role" },
        { status: 400 }
      );
    }

    const updateData: { role?: string; isActive?: boolean } = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("[Admin Users] PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

