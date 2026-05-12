/**
 * Admin Data Cleanup API
 *
 * DELETE /api/admin/cleanup-data
 * Removes revenue data (Bidder_Yandex, Bidder_Advertiv, Bidder_YHS and Overview_Report) for cleanup before resync.
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

    if (!isAdmin((session.user as { role?: string }).role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    let type: "yandex" | "advertiv" | "yhs" | "all" = "all";
    let userId: string | null = null;

    try {
      const body = await request.json();
      type = body.type || "all";
      userId = body.userId || null;
    } catch {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get("userId");
    }

    if (userId) {
      const results: { yandex?: number; advertiv?: number; yhs?: number; overview?: number } = {};

      if (type === "yandex" || type === "all") {
        const yandexDeleted = await prisma.bidder_Yandex.deleteMany({ where: { userId } });
        results.yandex = yandexDeleted.count;
      }
      if (type === "advertiv" || type === "all") {
        const advertivDeleted = await prisma.bidder_Advertiv.deleteMany({ where: { userId } });
        results.advertiv = advertivDeleted.count;
      }
      if (type === "yhs" || type === "all") {
        const yhsDeleted = await prisma.bidder_YHS.deleteMany({ where: { userId } });
        results.yhs = yhsDeleted.count;
      }
      if (type === "all") {
        const overviewDeleted = await prisma.overview_Report.deleteMany({ where: { userId } });
        results.overview = overviewDeleted.count;
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${type} data for user ${userId}`,
        deleted: results,
      });
    }

    const results: { yandex?: number; advertiv?: number; yhs?: number; overview?: number } = {};

    if (type === "yandex") {
      const yandexDeleted = await prisma.bidder_Yandex.deleteMany({});
      const overviewDeleted = await prisma.overview_Report.deleteMany({ where: { network: "yandex" } });
      results.yandex = yandexDeleted.count;
      results.overview = overviewDeleted.count;

      return NextResponse.json({
        success: true,
        message: `Deleted ${results.yandex} Yandex records and ${results.overview} overview records`,
        deleted: results,
      });
    }

    if (type === "advertiv") {
      const advertivDeleted = await prisma.bidder_Advertiv.deleteMany({});
      const overviewDeleted = await prisma.overview_Report.deleteMany({ where: { network: "advertiv" } });
      results.advertiv = advertivDeleted.count;
      results.overview = overviewDeleted.count;

      return NextResponse.json({
        success: true,
        message: `Deleted ${results.advertiv} Yahoo records and ${results.overview} overview records`,
        deleted: results,
      });
    }

    if (type === "yhs") {
      const yhsDeleted = await prisma.bidder_YHS.deleteMany({});
      const overviewDeleted = await prisma.overview_Report.deleteMany({ where: { network: "yhs" } });
      results.yhs = yhsDeleted.count;
      results.overview = overviewDeleted.count;

      return NextResponse.json({
        success: true,
        message: `Deleted ${results.yhs} YHS records and ${results.overview} overview records`,
        deleted: results,
      });
    }

    const [yandexDeleted, advertivDeleted, yhsDeleted, overviewDeleted] = await Promise.all([
      prisma.bidder_Yandex.deleteMany({}),
      prisma.bidder_Advertiv.deleteMany({}),
      prisma.bidder_YHS.deleteMany({}),
      prisma.overview_Report.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      message: "All revenue data deleted (Yandex + Yahoo + YHS + Overview). Ready for resync.",
      deleted: {
        bidderYandex: yandexDeleted.count,
        bidderAdvertiv: advertivDeleted.count,
        bidderYhs: yhsDeleted.count,
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

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!isAdmin((session.user as { role?: string }).role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    const [yandexByUser, advertivByUser, yhsByUser, overviewByUser] = await Promise.all([
      prisma.bidder_Yandex.groupBy({
        by: ["userId"],
        _count: true,
      }),
      prisma.bidder_Advertiv.groupBy({
        by: ["userId"],
        _count: true,
      }),
      prisma.bidder_YHS.groupBy({
        by: ["userId"],
        _count: true,
      }),
      prisma.overview_Report.groupBy({
        by: ["userId"],
        _count: true,
      }),
    ]);

    const userIds = [...new Set([
      ...yandexByUser.map(y => y.userId),
      ...advertivByUser.map(a => a.userId),
      ...yhsByUser.map(y => y.userId),
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
      yandexRecords: yandexByUser.find(y => y.userId === userId)?._count || 0,
      advertivRecords: advertivByUser.find(a => a.userId === userId)?._count || 0,
      yhsRecords: yhsByUser.find(y => y.userId === userId)?._count || 0,
      overviewRecords: overviewByUser.find(o => o.userId === userId)?._count || 0,
    }));

    return NextResponse.json({
      success: true,
      dataByUser,
      totals: {
        yandexRecords: yandexByUser.reduce((sum, y) => sum + y._count, 0),
        advertivRecords: advertivByUser.reduce((sum, a) => sum + a._count, 0),
        yhsRecords: yhsByUser.reduce((sum, y) => sum + y._count, 0),
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
