/**
 * Dashboard Summary Page
 * 
 * Shows aggregated revenue data for current/last month.
 * All networks combined (no grouping by network).
 * Gross revenue is only visible to admin users.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "RevEngine Media - Dashboard",
};
import { redirect } from "next/navigation";
import { getDashboardSummary, getSyncStatus, getRevenueComparison } from "@/lib/revenue-db";
import { canViewGrossRevenue, isAdmin } from "@/lib/roles";
import { DashboardCards } from "./_components/dashboard-cards";
import { DashboardChart } from "./_components/dashboard-chart";
import { TopDomains } from "./_components/top-domains";
import { PeriodToggle } from "./_components/period-toggle";
import { SyncStatus } from "./_components/sync-status";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const period = params.period === "last" ? "last" : "current";
  const [data, syncStatus, comparison] = await Promise.all([
    getDashboardSummary(session.user.id, period),
    getSyncStatus(session.user.id),
    getRevenueComparison(session.user.id),
  ]);
  const showGrossRevenue = canViewGrossRevenue(session.user.role);
  const userIsAdmin = isAdmin(session.user.role);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {period === "current" ? "Current Month" : "Last Month"} Summary ({data.dateRange.start} to {data.dateRange.end})
          </p>
        </div>
        <PeriodToggle currentPeriod={period} />
      </div>

      {/* Sync Status */}
      <SyncStatus 
        lastSync={syncStatus.lastSync}
        recordCounts={syncStatus.recordCounts}
        isAdmin={userIsAdmin}
      />

      {/* Summary Cards */}
      <DashboardCards 
        totals={data.totals} 
        byNetwork={data.byNetwork}
        comparison={period === "current" ? comparison.change : undefined}
        showGrossRevenue={showGrossRevenue} 
      />

      {/* Chart and Top Domains */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardChart dailyData={data.dailyData} showGrossRevenue={showGrossRevenue} />
        </div>
        <div className="lg:col-span-1">
          <TopDomains domains={data.topDomains} showGrossRevenue={showGrossRevenue} />
        </div>
      </div>
    </div>
  );
}
