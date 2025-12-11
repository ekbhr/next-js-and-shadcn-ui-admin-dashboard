/**
 * Admin Yandex Report Page
 * 
 * Detailed Yandex revenue data across all users.
 * Shows gross and net revenue with domain and tag breakdown.
 * 
 * OPTIMIZED: Uses database aggregation instead of fetching all records
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { YandexReportTable } from "./_components/yandex-report-table";
import { YandexReportSummary } from "./_components/yandex-report-summary";

export const metadata: Metadata = {
  title: "RevEngine Media - Yandex Report",
};

export default async function AdminYandexReportPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isAdmin(session.user.role)) {
    redirect("/dashboard/unauthorized");
  }

  // Get date range (last 31 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 31);

  const dateWhere = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  // OPTIMIZED: Use parallel database queries with aggregation
  const [
    grandTotalsRaw,
    domainTotalsRaw,
    tagTotalsRaw,
    userTotalsRaw,
    recentReports,
  ] = await Promise.all([
    // Grand totals using aggregate (1 query)
    prisma.bidder_Yandex.aggregate({
      where: dateWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
    }),
    
    // Domain totals using groupBy (1 query)
    prisma.bidder_Yandex.groupBy({
      by: ["domain"],
      where: dateWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          grossRevenue: "desc",
        },
      },
    }),
    
    // Tag totals using groupBy (1 query)
    prisma.bidder_Yandex.groupBy({
      by: ["tagId", "tagName"],
      where: dateWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          grossRevenue: "desc",
        },
      },
    }),
    
    // User totals using groupBy (1 query)
    prisma.bidder_Yandex.groupBy({
      by: ["userId"],
      where: dateWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          grossRevenue: "desc",
        },
      },
    }),
    
    // Recent reports with limit for table display (1 query)
    prisma.bidder_Yandex.findMany({
      where: dateWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 500, // Limit for performance
    }),
  ]);

  // Get unique user emails for the user totals
  const userIds = userTotalsRaw.map(u => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  // Format grand totals
  const grandTotals = {
    grossRevenue: grandTotalsRaw._sum.grossRevenue || 0,
    netRevenue: grandTotalsRaw._sum.netRevenue || 0,
    impressions: grandTotalsRaw._sum.impressions || 0,
    clicks: grandTotalsRaw._sum.clicks || 0,
    userCount: userTotalsRaw.length,
    domainCount: domainTotalsRaw.filter(d => d.domain !== null).length,
    tagCount: tagTotalsRaw.filter(t => t.tagId !== null).length,
    recordCount: grandTotalsRaw._count,
  };

  // Format domain totals
  const domainTotalsArray = domainTotalsRaw.map(d => ({
    domain: d.domain || "Unknown",
    grossRevenue: d._sum.grossRevenue || 0,
    netRevenue: d._sum.netRevenue || 0,
    impressions: d._sum.impressions || 0,
    clicks: d._sum.clicks || 0,
    recordCount: d._count,
  }));

  // Format tag totals
  const tagTotalsArray = tagTotalsRaw.map(t => ({
    tagId: t.tagId || "Unknown",
    tagName: t.tagName || t.tagId || "Unknown",
    grossRevenue: t._sum.grossRevenue || 0,
    netRevenue: t._sum.netRevenue || 0,
    impressions: t._sum.impressions || 0,
    clicks: t._sum.clicks || 0,
    recordCount: t._count,
  }));

  // Format user totals
  const userTotalsArray = userTotalsRaw.map(u => {
    const user = userMap.get(u.userId);
    return {
      userId: u.userId,
      userName: user?.name || null,
      userEmail: user?.email || "Unknown",
      grossRevenue: u._sum.grossRevenue || 0,
      netRevenue: u._sum.netRevenue || 0,
      impressions: u._sum.impressions || 0,
      clicks: u._sum.clicks || 0,
      domainCount: 0,
    };
  });

  // Format reports for the table
  const formattedReports = recentReports.map((r) => ({
    id: r.id,
    date: r.date,
    domain: r.domain || "Unknown",
    tagId: r.tagId,
    tagName: r.tagName,
    grossRevenue: r.grossRevenue,
    netRevenue: r.netRevenue,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr,
    rpm: r.rpm,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Yandex Report</h1>
        <p className="text-muted-foreground">
          Detailed Yandex Advertising Network revenue (last 31 days)
          {grandTotals.recordCount > 500 && (
            <span className="text-xs ml-2">
              (showing latest 500 of {grandTotals.recordCount} records)
            </span>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <YandexReportSummary totals={grandTotals} />

      {/* Data Tables */}
      <YandexReportTable
        reports={formattedReports}
        domainTotals={domainTotalsArray}
        tagTotals={tagTotalsArray}
        userTotals={userTotalsArray}
      />
    </div>
  );
}

