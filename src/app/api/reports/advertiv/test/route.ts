/**
 * Advertiv API Test Endpoint
 *
 * GET/POST /api/reports/advertiv/test
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { advertivClient } from "@/lib/advertiv";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";

async function testAdvertivApi(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success: rateLimitOk, remaining } = await apiLimiter.check(10, `advertiv-test:${ip}`);
  if (!rateLimitOk) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const configStatus = advertivClient.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json({
        success: false,
        message: "Yahoo API is not configured",
        config: {
          hasApiKey: configStatus.hasApiKey,
          apiUrl: configStatus.apiUrl,
        },
        instructions: [
          "Add ADVERTIV_API_KEY to .env.local",
          "Restart the development server",
        ],
      });
    }

    const result = await advertivClient.getRevenueData();
    return NextResponse.json({
      success: result.success,
      message: result.success ? "Yahoo API connection test completed" : "Yahoo API test failed",
      config: {
        hasApiKey: configStatus.hasApiKey,
        apiUrl: configStatus.apiUrl,
      },
      testResult: {
        dataReturned: result.success,
        recordCount: result.data?.length || 0,
        dateRange: result.dateRange,
        totalRevenue: result.totalRevenue,
        totalClicks: result.totalClicks,
        totalImpressions: result.totalImpressions,
        error: result.error,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Yahoo API test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return testAdvertivApi(request);
}

export async function POST(request: Request) {
  return testAdvertivApi(request);
}
