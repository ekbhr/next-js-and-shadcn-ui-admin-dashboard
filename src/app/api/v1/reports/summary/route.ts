/**
 * Publisher API - Revenue Summary
 * 
 * GET /api/v1/reports/summary
 * 
 * Returns aggregated revenue totals for a period.
 * 
 * Query Parameters:
 * - startDate: YYYY-MM-DD (default: 30 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 * - groupBy: day | domain | network (default: none - returns grand total)
 *   For domain, Yahoo rows include campaignId (one row per sub + campaign).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, checkRateLimit } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // ============================================
    // Authentication via API Key
    // ============================================
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing or invalid Authorization header. Use: Bearer <api_key>" 
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }

    if (!validation.scopes?.includes("reports:read")) {
      return NextResponse.json(
        { success: false, error: "API key does not have 'reports:read' permission" },
        { status: 403 }
      );
    }

    // ============================================
    // Rate Limiting
    // ============================================
    const rateLimit = await checkRateLimit(validation.apiKeyId!);
    
    const rateLimitHeaders = {
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
    };

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // ============================================
    // Parse Query Parameters
    // ============================================
    const { searchParams } = new URL(request.url);
    
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date();
    
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const groupBy = searchParams.get("groupBy") as "day" | "domain" | "network" | null;

    // ============================================
    // Fetch Summary Data
    // ============================================
    const userId = validation.userId!;

    const whereClause = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    const yandexWhere = { ...whereClause, network: "yandex" as const };

    const mergeDailyMap = (
      rows: Array<{
        date: Date;
        _sum: { netRevenue: number | null; impressions: number | null; clicks: number | null };
      }>,
      into: Map<string, { revenue: number; impressions: number; clicks: number }>,
    ) => {
      for (const d of rows) {
        const key = d.date.toISOString().split("T")[0];
        const prev = into.get(key);
        const rev = d._sum.netRevenue || 0;
        const imp = d._sum.impressions || 0;
        const clk = d._sum.clicks || 0;
        if (prev) {
          prev.revenue += rev;
          prev.impressions += imp;
          prev.clicks += clk;
        } else {
          into.set(key, { revenue: rev, impressions: imp, clicks: clk });
        }
      }
    };

    // Grand total (no grouping)
    if (!groupBy) {
      const [ya, adv, yhs] = await Promise.all([
        prisma.overview_Report.aggregate({
          where: yandexWhere,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          _count: true,
        }),
        prisma.bidder_Advertiv.aggregate({
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          _count: true,
        }),
        prisma.bidder_YHS.aggregate({
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          _count: true,
        }),
      ]);

      const revenue =
        (ya._sum.netRevenue || 0) + (adv._sum.netRevenue || 0) + (yhs._sum.netRevenue || 0);
      const impressions =
        (ya._sum.impressions || 0) + (adv._sum.impressions || 0) + (yhs._sum.impressions || 0);
      const clicks =
        (ya._sum.clicks || 0) + (adv._sum.clicks || 0) + (yhs._sum.clicks || 0);

      return NextResponse.json(
        {
          success: true,
          summary: {
            revenue: Math.round(revenue * 100) / 100,
            impressions,
            clicks,
            recordCount: ya._count + adv._count + yhs._count,
          },
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // Group by day
    if (groupBy === "day") {
      const [yandexDaily, advertivDaily, yhsDaily] = await Promise.all([
        prisma.overview_Report.groupBy({
          by: ["date"],
          where: yandexWhere,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          orderBy: { date: "asc" },
        }),
        prisma.bidder_Advertiv.groupBy({
          by: ["date"],
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          orderBy: { date: "asc" },
        }),
        prisma.bidder_YHS.groupBy({
          by: ["date"],
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
          orderBy: { date: "asc" },
        }),
      ]);

      const dailyMap = new Map<string, { revenue: number; impressions: number; clicks: number }>();
      mergeDailyMap(yandexDaily, dailyMap);
      mergeDailyMap(advertivDaily, dailyMap);
      mergeDailyMap(yhsDaily, dailyMap);

      const data = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          revenue: Math.round(v.revenue * 100) / 100,
          impressions: v.impressions,
          clicks: v.clicks,
        }));

      return NextResponse.json(
        {
          success: true,
          data,
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // Group by domain (Yahoo / Advertiv split by campaign so each row is one sub + campaign)
    if (groupBy === "domain") {
      const [yandexDomain, advertivByCampaign, yhsDomain] = await Promise.all([
        prisma.overview_Report.groupBy({
          by: ["domain"],
          where: yandexWhere,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
        prisma.bidder_Advertiv.groupBy({
          by: ["domain", "campaignId"],
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
        prisma.bidder_YHS.groupBy({
          by: ["domain"],
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
      ]);

      type DomainRow = {
        network: string;
        domain: string;
        campaignId: string | null;
        revenue: number;
        impressions: number;
        clicks: number;
      };

      const rows: DomainRow[] = [];

      for (const d of yandexDomain) {
        rows.push({
          network: "yandex",
          domain: d.domain || "Unknown",
          campaignId: null,
          revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
          impressions: d._sum.impressions || 0,
          clicks: d._sum.clicks || 0,
        });
      }

      for (const d of advertivByCampaign) {
        rows.push({
          network: "advertiv",
          domain: d.domain || "Unknown",
          campaignId: d.campaignId,
          revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
          impressions: d._sum.impressions || 0,
          clicks: d._sum.clicks || 0,
        });
      }

      for (const d of yhsDomain) {
        rows.push({
          network: "yhs",
          domain: d.domain || "Unknown",
          campaignId: null,
          revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
          impressions: d._sum.impressions || 0,
          clicks: d._sum.clicks || 0,
        });
      }

      rows.sort((a, b) => b.revenue - a.revenue);

      return NextResponse.json(
        {
          success: true,
          data: rows,
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // Group by network
    if (groupBy === "network") {
      const [ya, adv, yhs] = await Promise.all([
        prisma.overview_Report.aggregate({
          where: yandexWhere,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
        prisma.bidder_Advertiv.aggregate({
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
        prisma.bidder_YHS.aggregate({
          where: whereClause,
          _sum: {
            netRevenue: true,
            impressions: true,
            clicks: true,
          },
        }),
      ]);

      const networkData = [
        {
          network: "yandex",
          revenue: Math.round((ya._sum.netRevenue || 0) * 100) / 100,
          impressions: ya._sum.impressions || 0,
          clicks: ya._sum.clicks || 0,
        },
        {
          network: "advertiv",
          revenue: Math.round((adv._sum.netRevenue || 0) * 100) / 100,
          impressions: adv._sum.impressions || 0,
          clicks: adv._sum.clicks || 0,
        },
        {
          network: "yhs",
          revenue: Math.round((yhs._sum.netRevenue || 0) * 100) / 100,
          impressions: yhs._sum.impressions || 0,
          clicks: yhs._sum.clicks || 0,
        },
      ].sort((a, b) => b.revenue - a.revenue);

      return NextResponse.json(
        {
          success: true,
          data: networkData,
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid groupBy parameter" },
      { status: 400, headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("[API v1 Summary] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

