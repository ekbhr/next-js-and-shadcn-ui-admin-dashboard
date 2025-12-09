import { NextRequest, NextResponse } from "next/server";
import { sedoClient } from "@/lib/sedo";
import type { SedoReportParams } from "@/lib/sedo";
import { processSedoReport } from "@/lib/sedo-processor";
// import { prisma } from "@/lib/prisma"; // Will be used when querying saved data

/**
 * GET /api/reports/sedo/summary
 * 
 * Fetch summary/overview data from Sedo (aggregated metrics)
 * 
 * This endpoint:
 * 1. Pulls data from Sedo API
 * 2. Processes and aggregates the data
 * 3. Returns summary metrics
 * 
 * Future: Can also aggregate from saved database records
 * 
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to 30 days ago)
 * - endDate: YYYY-MM-DD (optional, defaults to today)
 * - domain: Filter by specific domain (optional)
 * - revshare: Revshare percentage 0-100 (optional, for calculating net revenue)
 * - source: "api" | "database" (optional, defaults to "api")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: SedoReportParams = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      domain: searchParams.get("domain") || undefined,
    };

    const revshareParam = searchParams.get("revshare");
    const revshare = revshareParam ? parseFloat(revshareParam) : undefined;
    const source = searchParams.get("source") || "api";

    // For now, always fetch from API
    // TODO: Add option to aggregate from database when models are ready
    // if (source === "database") {
    //   // Aggregate from saved database records
    //   // const records = await prisma.sedoReport.findMany({ ... });
    //   // return aggregated summary
    // }

    // Step 1: Pull data from Sedo API
    const rawResult = await sedoClient.getRevenueData(params);
    
    if (!rawResult.success) {
      return NextResponse.json(
        { error: rawResult.error || "Failed to fetch Sedo summary data" },
        { status: 500 },
      );
    }

    // Step 2: Process data
    const processedResult = processSedoReport(rawResult, {
      revshare,
      source: "api",
    });

    if (!processedResult.success || !processedResult.processed) {
      return NextResponse.json(
        { error: processedResult.error || "Failed to process Sedo data" },
        { status: 500 },
      );
    }

    // Step 3: Calculate summary metrics from processed data
    const processed = processedResult.processed;
    const totalRevenue = processed.reduce((sum, item) => sum + (item.netRevenue || item.grossRevenue || 0), 0);
    const totalClicks = processed.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const totalImpressions = processed.reduce((sum, item) => sum + (item.impressions || 0), 0);
    
    const avgDailyRevenue = processed.length > 0 ? totalRevenue / processed.length : 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgRPM = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

    // Calculate period-over-period change (compare with previous period)
    // TODO: Fetch previous period data from API or database for accurate comparison
    const previousPeriodRevenue = totalRevenue * 0.9; // Mock: 10% decrease
    const revenueChange = totalRevenue - previousPeriodRevenue;
    const revenueChangePercent = previousPeriodRevenue > 0 
      ? ((revenueChange / previousPeriodRevenue) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalClicks,
        totalImpressions,
        avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
        avgRPM: Math.round(avgRPM * 100) / 100,
        revenueChange: Math.round(revenueChange * 100) / 100,
        revenueChangePercent: Math.round(revenueChangePercent * 100) / 100,
        period: {
          start: processedResult.metadata?.dateRange?.start,
          end: processedResult.metadata?.dateRange?.end,
          days: processed.length,
        },
      },
      source: "api", // Will be "database" when querying from DB
    }, { status: 200 });
  } catch (error) {
    console.error("Sedo summary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

