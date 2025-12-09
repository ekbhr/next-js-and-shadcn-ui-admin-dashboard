/**
 * Revenue Overview Page
 * 
 * Simple data table view with filters.
 * No charts or summary cards - just the raw data.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOverviewReport } from "@/lib/revenue-db";
import { RevenueDataTable } from "./_components/revenue-data-table";
import { OverviewFilters } from "./_components/overview-filters";

interface PageProps {
  searchParams: Promise<{
    network?: string;
    days?: string;
  }>;
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const params = await searchParams;
  
  // Parse filter params
  const network = params.network || undefined;
  const days = parseInt(params.days || "31");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await getOverviewReport(userId, {
    startDate,
    endDate,
    network,
  });

  // Get unique networks for filter dropdown
  const networks = [...new Set(data.map(d => d.network))].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header with Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Data</h1>
          <p className="text-muted-foreground">
            Detailed breakdown by network and domain
          </p>
        </div>
        <OverviewFilters 
          networks={networks} 
          currentNetwork={network} 
          currentDays={days} 
        />
      </div>

      {/* Revenue DataTable with Pagination */}
      <RevenueDataTable data={data} />
    </div>
  );
}

