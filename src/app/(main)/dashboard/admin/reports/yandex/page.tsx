/**
 * Admin Yandex Report Page
 * 
 * Detailed Yandex revenue data across all users.
 * Shows gross and net revenue with domain and tag breakdown.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { YandexReportTable } from "./_components/yandex-report-table";
import { YandexReportSummary } from "./_components/yandex-report-summary";
import { SyncYandexButton } from "./_components/sync-yandex-button";

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

  // Get all Yandex reports
  const yandexReports = await prisma.bidder_Yandex.findMany({
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

  // Calculate totals per tag
  const tagTotals = new Map<string, {
    tagId: string;
    tagName: string;
    domain?: string;
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
  const uniqueTags = new Set<string>();

  for (const report of yandexReports) {
    const domain = report.domain || "Unknown";
    const tagId = report.tagId || "Unknown";
    
    if (report.domain) uniqueDomains.add(report.domain);
    if (report.tagId) uniqueTags.add(report.tagId);

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

    // Tag totals
    const existingTag = tagTotals.get(tagId);
    if (existingTag) {
      existingTag.grossRevenue += report.grossRevenue;
      existingTag.netRevenue += report.netRevenue;
      existingTag.impressions += report.impressions;
      existingTag.clicks += report.clicks;
      existingTag.recordCount += 1;
    } else {
      tagTotals.set(tagId, {
        tagId,
        tagName: report.tagName || tagId,
        domain: report.domain || undefined,
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
    tagCount: uniqueTags.size,
    recordCount: yandexReports.length,
  };

  for (const [, total] of domainTotals) {
    grandTotals.grossRevenue += total.grossRevenue;
    grandTotals.netRevenue += total.netRevenue;
    grandTotals.impressions += total.impressions;
    grandTotals.clicks += total.clicks;
  }

  // Format reports for the table
  const formattedReports = yandexReports.map((r) => ({
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

  const domainTotalsArray = Array.from(domainTotals.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  const tagTotalsArray = Array.from(tagTotals.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  const userTotalsArray = Array.from(userTotals.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yandex Report</h1>
          <p className="text-muted-foreground">
            Detailed Yandex Advertising Network revenue (last 31 days)
          </p>
        </div>
        <SyncYandexButton />
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

