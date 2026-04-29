/**
 * YHS API Test Endpoint
 *
 * GET/POST /api/reports/yhs/test
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { yhsClient } from "@/lib/yhs";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";

async function testYhsApi(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success: rateLimitOk, remaining } = await apiLimiter.check(10, `yhs-test:${ip}`);
  if (!rateLimitOk) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const configStatus = yhsClient.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json({
        success: false,
        message: "YHS API is not configured",
        config: {
          hasApiKey: configStatus.hasApiKey,
          apiUrl: configStatus.apiUrl,
        },
        instructions: ["Add YHS_API_KEY to .env.local", "Restart the development server"],
      });
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);

    const result = await yhsClient.getRevenueData({
      startDate: startDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? "YHS API connection test completed" : "YHS API test failed",
      config: {
        hasApiKey: configStatus.hasApiKey,
        apiUrl: configStatus.apiUrl,
      },
      testResult: {
        dataReturned: result.success,
        recordCount: result.data?.length || 0,
        dateRange: {
          from: startDate.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        },
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
        message: "YHS API test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return testYhsApi(request);
}

export async function POST(request: Request) {
  return testYhsApi(request);
}
