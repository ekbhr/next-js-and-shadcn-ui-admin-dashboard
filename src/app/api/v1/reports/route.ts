/**
 * Publisher API - Revenue Reports
 * 
 * GET /api/v1/reports
 * 
 * Authenticated via API key in header:
 * Authorization: Bearer rem_xxxxx
 * 
 * Query Parameters:
 * - startDate: YYYY-MM-DD (default: 30 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 * - domain: Filter by domain (optional)
 * - format: json | csv (default: json)
 * - limit: Number of records (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
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

    const apiKey = authHeader.substring(7); // Remove "Bearer "
    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }

    // Check scope
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
      "X-RateLimit-Limit": String(rateLimit.remaining + (rateLimit.allowed ? 0 : 1)),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
    };

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Try again later.",
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // ============================================
    // Parse Query Parameters
    // ============================================
    const { searchParams } = new URL(request.url);
    
    // Date range
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date();
    
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Domain filter
    const domain = searchParams.get("domain") || undefined;

    // Pagination
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "100"), 1),
      1000
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // Output format
    const format = searchParams.get("format") || "json";

    // ============================================
    // Fetch Data
    // ============================================
    const userId = validation.userId!;

    const where = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(domain && { domain }),
    };

    const [data, totalCount] = await Promise.all([
      prisma.overview_Report.findMany({
        where,
        select: {
          date: true,
          network: true,
          domain: true,
          netRevenue: true,
          impressions: true,
          clicks: true,
          ctr: true,
          rpm: true,
          currency: true,
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.overview_Report.count({ where }),
    ]);

    // ============================================
    // Format Response
    // ============================================
    
    // CSV Export
    if (format === "csv") {
      if (!validation.scopes?.includes("reports:export")) {
        return NextResponse.json(
          { success: false, error: "API key does not have 'reports:export' permission" },
          { status: 403, headers: rateLimitHeaders }
        );
      }

      const csvHeader = "date,network,domain,revenue,impressions,clicks,ctr,rpm,currency\n";
      const csvRows = data.map(row => 
        [
          row.date.toISOString().split("T")[0],
          row.network,
          row.domain || "",
          row.netRevenue.toFixed(2),
          row.impressions,
          row.clicks,
          row.ctr?.toFixed(2) || "",
          row.rpm?.toFixed(2) || "",
          row.currency,
        ].join(",")
      ).join("\n");

      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="revenue-report-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv"`,
          ...rateLimitHeaders,
        },
      });
    }

    // JSON Response (default)
    const formattedData = data.map(row => ({
      date: row.date.toISOString().split("T")[0],
      network: row.network,
      domain: row.domain,
      revenue: Math.round(row.netRevenue * 100) / 100,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr ? Math.round(row.ctr * 100) / 100 : null,
      rpm: row.rpm ? Math.round(row.rpm * 100) / 100 : null,
      currency: row.currency,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + data.length < totalCount,
        },
        filters: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          domain: domain || null,
        },
      },
      { headers: rateLimitHeaders }
    );
  } catch (error) {
    console.error("[API v1 Reports] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

