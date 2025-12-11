/**
 * Admin Sedo Report Page
 * 
 * Detailed Sedo revenue data across all users.
 * Shows gross and net revenue with domain breakdown.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { SedoReportTable } from "./_components/sedo-report-table";
import { SedoReportSummary } from "./_components/sedo-report-summary";

export const metadata: Metadata = {
  title: "RevEngine Media - Sedo Report",
};

export default async function AdminSedoReportPage() {
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

  // Get all Sedo reports (from Bidder_Sedo table)
  const sedoReports = await prisma.bidder_Sedo.findMany({
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

  // Calculate totals per domain
  const domainTotals = new Map<string, {
    domain: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    recordCount: number;
  }>();

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

  const uniqueDomains = new Set<string>();

  for (const report of sedoReports) {
    const domain = report.domain || "Unknown";
    if (report.domain) uniqueDomains.add(report.domain);

    // Domain totals
    const existingDomain = domainTotals.get(domain);
    if (existingDomain) {
      existingDomain.grossRevenue += report.grossRevenue;
      existingDomain.netRevenue += report.netRevenue;
      existingDomain.impressions += report.impressions;
      existingDomain.clicks += report.clicks;
      existingDomain.recordCount += 1;
    } else {
      domainTotals.set(domain, {
        domain,
        grossRevenue: report.grossRevenue,
        netRevenue: report.netRevenue,
        impressions: report.impressions,
        clicks: report.clicks,
        recordCount: 1,
      });
    }

    // User totals
    const existingUser = userTotals.get(report.userId);
    if (existingUser) {
      existingUser.grossRevenue += report.grossRevenue;
      existingUser.netRevenue += report.netRevenue;
      existingUser.impressions += report.impressions;
      existingUser.clicks += report.clicks;
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

  // Grand totals
  const grandTotals = {
    grossRevenue: 0,
    netRevenue: 0,
    impressions: 0,
    clicks: 0,
    userCount: userTotals.size,
    domainCount: uniqueDomains.size,
    recordCount: sedoReports.length,
  };

  for (const [, total] of domainTotals) {
    grandTotals.grossRevenue += total.grossRevenue;
    grandTotals.netRevenue += total.netRevenue;
    grandTotals.impressions += total.impressions;
    grandTotals.clicks += total.clicks;
  }

  // Format reports for the table
  const formattedReports = sedoReports.map((r) => ({
    id: r.id,
    date: r.date,
    domain: r.domain || "Unknown",
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

  const domainTotalsArray = Array.from(domainTotals.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  const userTotalsArray = Array.from(userTotals.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Sedo Report</h1>
        <p className="text-muted-foreground">
          Detailed Sedo parking revenue (last 31 days)
        </p>
      </div>

      {/* Summary Cards */}
      <SedoReportSummary totals={grandTotals} />

      {/* Data Tables */}
      <SedoReportTable
        reports={formattedReports}
        domainTotals={domainTotalsArray}
        userTotals={userTotalsArray}
      />
    </div>
  );
}

