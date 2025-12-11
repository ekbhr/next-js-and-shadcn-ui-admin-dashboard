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

    const where = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Grand total (no grouping)
    if (!groupBy) {
      const totals = await prisma.overview_Report.aggregate({
        where,
        _sum: {
          netRevenue: true,
          impressions: true,
          clicks: true,
        },
        _count: true,
      });

      return NextResponse.json(
        {
          success: true,
          summary: {
            revenue: Math.round((totals._sum.netRevenue || 0) * 100) / 100,
            impressions: totals._sum.impressions || 0,
            clicks: totals._sum.clicks || 0,
            recordCount: totals._count,
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
      const dailyData = await prisma.overview_Report.groupBy({
        by: ["date"],
        where,
        _sum: {
          netRevenue: true,
          impressions: true,
          clicks: true,
        },
        orderBy: { date: "asc" },
      });

      return NextResponse.json(
        {
          success: true,
          data: dailyData.map(d => ({
            date: d.date.toISOString().split("T")[0],
            revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
            impressions: d._sum.impressions || 0,
            clicks: d._sum.clicks || 0,
          })),
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // Group by domain
    if (groupBy === "domain") {
      const domainData = await prisma.overview_Report.groupBy({
        by: ["domain"],
        where,
        _sum: {
          netRevenue: true,
          impressions: true,
          clicks: true,
        },
        orderBy: {
          _sum: { netRevenue: "desc" },
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: domainData.map(d => ({
            domain: d.domain || "Unknown",
            revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
            impressions: d._sum.impressions || 0,
            clicks: d._sum.clicks || 0,
          })),
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
      const networkData = await prisma.overview_Report.groupBy({
        by: ["network"],
        where,
        _sum: {
          netRevenue: true,
          impressions: true,
          clicks: true,
        },
        orderBy: {
          _sum: { netRevenue: "desc" },
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: networkData.map(d => ({
            network: d.network,
            revenue: Math.round((d._sum.netRevenue || 0) * 100) / 100,
            impressions: d._sum.impressions || 0,
            clicks: d._sum.clicks || 0,
          })),
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

