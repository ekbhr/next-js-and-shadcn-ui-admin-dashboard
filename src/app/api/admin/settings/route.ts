/**
 * Admin Settings API
 * 
 * GET /api/admin/settings - Get system settings
 * PATCH /api/admin/settings - Update system settings
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { getSystemSettings, updateSystemSettings } from "@/lib/settings";

// Get settings
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const settings = await getSystemSettings();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

// Update settings
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { defaultRevShare, emailOnSyncFailure, emailWeeklySummary, adminEmail } = body;

    // Validate defaultRevShare
    if (defaultRevShare !== undefined) {
      if (typeof defaultRevShare !== "number" || defaultRevShare < 0 || defaultRevShare > 100) {
        return NextResponse.json(
          { error: "RevShare must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (adminEmail !== undefined && adminEmail !== null && adminEmail !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    const settings = await updateSystemSettings({
      defaultRevShare,
      emailOnSyncFailure,
      emailWeeklySummary,
      adminEmail: adminEmail || null,
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

