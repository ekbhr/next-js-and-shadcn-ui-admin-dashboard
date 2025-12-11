/**
 * Admin Data Cleanup API
 * 
 * DELETE /api/admin/cleanup-data
 * Removes all revenue data (Bidder_Sedo, Bidder_Yandex, and Overview_Report) for cleanup before resync.
 * 
 * GET /api/admin/cleanup-data?userId=xxx
 * Removes data for a specific user only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Delete data for specific user
      const [sedoDeleted, yandexDeleted, overviewDeleted] = await Promise.all([
        prisma.bidder_Sedo.deleteMany({ where: { userId } }),
        prisma.bidder_Yandex.deleteMany({ where: { userId } }),
        prisma.overview_Report.deleteMany({ where: { userId } }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Deleted data for user ${userId}`,
        deleted: {
          bidderSedo: sedoDeleted.count,
          bidderYandex: yandexDeleted.count,
          overviewReport: overviewDeleted.count,
        },
      });
    }

    // Delete ALL data (for full resync)
    const [sedoDeleted, yandexDeleted, overviewDeleted] = await Promise.all([
      prisma.bidder_Sedo.deleteMany({}),
      prisma.bidder_Yandex.deleteMany({}),
      prisma.overview_Report.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      message: "All revenue data deleted (Sedo + Yandex + Overview). Ready for resync.",
      deleted: {
        bidderSedo: sedoDeleted.count,
        bidderYandex: yandexDeleted.count,
        overviewReport: overviewDeleted.count,
      },
    });
  } catch (error) {
    console.error("[Admin Cleanup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Cleanup failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to check data counts before cleanup
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

    // Get counts by user for all tables
    const [sedoByUser, yandexByUser, overviewByUser] = await Promise.all([
      prisma.bidder_Sedo.groupBy({
        by: ["userId"],
        _count: true,
      }),
      prisma.bidder_Yandex.groupBy({
        by: ["userId"],
        _count: true,
      }),
      prisma.overview_Report.groupBy({
        by: ["userId"],
        _count: true,
      }),
    ]);

    // Get user details
    const userIds = [...new Set([
      ...sedoByUser.map(s => s.userId),
      ...yandexByUser.map(y => y.userId),
      ...overviewByUser.map(o => o.userId),
    ])];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const dataByUser = userIds.map(userId => ({
      userId,
      email: userMap.get(userId)?.email || "Unknown",
      name: userMap.get(userId)?.name || null,
      sedoRecords: sedoByUser.find(s => s.userId === userId)?._count || 0,
      yandexRecords: yandexByUser.find(y => y.userId === userId)?._count || 0,
      overviewRecords: overviewByUser.find(o => o.userId === userId)?._count || 0,
    }));

    return NextResponse.json({
      success: true,
      dataByUser,
      totals: {
        sedoRecords: sedoByUser.reduce((sum, s) => sum + s._count, 0),
        yandexRecords: yandexByUser.reduce((sum, y) => sum + y._count, 0),
        overviewRecords: overviewByUser.reduce((sum, s) => sum + s._count, 0),
      },
    });
  } catch (error) {
    console.error("[Admin Cleanup] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get data counts" },
      { status: 500 }
    );
  }
}

