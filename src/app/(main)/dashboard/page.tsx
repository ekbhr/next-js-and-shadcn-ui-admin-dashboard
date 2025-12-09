/**
 * Dashboard Summary Page
 * 
 * Shows aggregated revenue data for current/last month.
 * All networks combined (no grouping by network).
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardSummary } from "@/lib/revenue-db";
import { DashboardCards } from "./_components/dashboard-cards";
import { DashboardChart } from "./_components/dashboard-chart";
import { TopDomains } from "./_components/top-domains";
import { PeriodToggle } from "./_components/period-toggle";

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
  const data = await getDashboardSummary(session.user.id, period);

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

      {/* Summary Cards */}
      <DashboardCards totals={data.totals} />

      {/* Chart and Top Domains */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardChart dailyData={data.dailyData} />
        </div>
        <div className="lg:col-span-1">
          <TopDomains domains={data.topDomains} />
        </div>
      </div>
    </div>
  );
}
