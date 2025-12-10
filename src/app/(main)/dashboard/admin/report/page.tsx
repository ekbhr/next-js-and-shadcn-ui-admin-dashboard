/**
 * Admin Report Page
 * 
 * Shows all revenue data across all users.
 * Includes gross and net revenue.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { AdminReportTable } from "./_components/admin-report-table";
import { AdminReportSummary } from "./_components/admin-report-summary";
import { CleanupButton } from "./_components/cleanup-button";

export const metadata: Metadata = {
  title: "RevEngine Media - Admin Report",
};

export default async function AdminReportPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Admin-only page
  if (!isAdmin(session.user.role)) {
    redirect("/dashboard/unauthorized");
  }

  // Get date range (last 31 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 31);

  // Get all overview reports with user info
  const reports = await prisma.overview_Report.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
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
  });

  // Calculate totals per user
  const userTotals = new Map<string, {
    userId: string;
    userName: string | null;
    userEmail: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    domainCount: number;
  }>();

  const domains = new Set<string>();

  for (const report of reports) {
    if (report.domain) domains.add(report.domain);

    const existing = userTotals.get(report.userId);
    if (existing) {
      existing.grossRevenue += report.grossRevenue;
      existing.netRevenue += report.netRevenue;
      existing.impressions += report.impressions;
      existing.clicks += report.clicks;
    } else {
      userTotals.set(report.userId, {
        userId: report.userId,
        userName: report.user.name,
        userEmail: report.user.email,
        grossRevenue: report.grossRevenue,
        netRevenue: report.netRevenue,
        impressions: report.impressions,
        clicks: report.clicks,
        domainCount: 0,
      });
    }
  }

  // Count domains per user
  const domainAssignments = await prisma.domain_Assignment.groupBy({
    by: ["userId"],
    _count: true,
  });

  for (const da of domainAssignments) {
    const userTotal = userTotals.get(da.userId);
    if (userTotal) {
      userTotal.domainCount = da._count;
    }
  }

  // Grand totals
  const grandTotals = {
    grossRevenue: 0,
    netRevenue: 0,
    impressions: 0,
    clicks: 0,
    userCount: userTotals.size,
    domainCount: domains.size,
  };

  for (const [, total] of userTotals) {
    grandTotals.grossRevenue += total.grossRevenue;
    grandTotals.netRevenue += total.netRevenue;
    grandTotals.impressions += total.impressions;
    grandTotals.clicks += total.clicks;
  }

  // Format reports for the table
  const formattedReports = reports.map((r) => ({
    id: r.id,
    date: r.date,
    network: r.network,
    domain: r.domain,
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

  const userTotalsArray = Array.from(userTotals.values());

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Report</h1>
          <p className="text-muted-foreground">
            Revenue overview across all users (last 31 days)
          </p>
        </div>
        <CleanupButton />
      </div>

      {/* Summary Cards */}
      <AdminReportSummary totals={grandTotals} />

      {/* User Totals */}
      <AdminReportTable
        reports={formattedReports}
        userTotals={userTotalsArray}
      />
    </div>
  );
}

