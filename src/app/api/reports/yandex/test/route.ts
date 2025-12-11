/**
 * Yandex API Test Endpoint
 *
 * Use this endpoint to test Yandex API connectivity
 * GET/POST /api/reports/yandex/test
 * 
 * Security: Requires admin authentication
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { yandexClient } from "@/lib/yandex";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";

async function testYandexApi(request: Request) {
  // Check authentication - admin only
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 }
    );
  }

  // Rate limiting
  const ip = getClientIp(request);
  const { success: rateLimitOk, remaining } = await apiLimiter.check(10, `yandex-test:${ip}`);
  if (!rateLimitOk) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    // Get configuration status
    const isConfigured = yandexClient.isConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        message: "Yandex API is not configured",
        config: {
          configured: false,
        },
        instructions: [
          "Add YANDEX_API (OAuth token) to .env.local",
          "Restart the development server",
        ],
      });
    }

    // Test API connection - fetch last 7 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7); // Last 7 days for quick test

    const result = await yandexClient.getRevenueData({
      startDate: startDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? "Yandex API connection test completed" 
        : "Yandex API test failed",
      config: {
        configured: true,
      },
      testResult: {
        dataReturned: result.success,
        recordCount: result.data?.length || 0,
        dateRange: {
          from: startDate.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        },
        error: result.error,
      },
    });
  } catch (error) {
    console.error("Yandex API test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Yandex API test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Support both GET and POST requests
export async function GET(request: Request) {
  return testYandexApi(request);
}

export async function POST(request: Request) {
  return testYandexApi(request);
}

