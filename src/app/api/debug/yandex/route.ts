/**
 * Debug endpoint for Yandex API
 * 
 * Temporary endpoint to test Yandex API connectivity
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import axios from "axios";

export async function GET(request: Request) {
  try {
    // Check for secret or auth
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    
    if (secret !== "debug-yandex-2024") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!isAdmin((session.user as { role?: string }).role)) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
    }

    const apiToken = process.env.YANDEX_API;
    
    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: "YANDEX_API not configured",
        hasToken: false,
      });
    }

    // Try different API endpoints and methods
    const results: Record<string, unknown> = {
      tokenPrefix: apiToken.substring(0, 10) + "...",
      tokenLength: apiToken.length,
      tests: {},
    };

    // Test 1: Partner Statistics API with query param
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    try {
      console.log("[Debug] Testing Yandex API...");
      
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          oauth_token: apiToken,
          date1: startDate,
          date2: endDate,
          group: "day",
          dimensions: "date",
          metrics: "shows,clicks,partner_wo_nds",
          currency: "usd",
          lang: "en",
        },
        headers: {
          Accept: "application/json",
        },
        timeout: 30000,
        validateStatus: () => true, // Don't throw on any status
      });

      results.tests = {
        ...results.tests as object,
        queryParam: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        queryParam: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 2: With Authorization header
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          group: "day",
          dimensions: "date",
          metrics: "shows,clicks,partner_wo_nds",
          currency: "usd",
          lang: "en",
        },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        authHeader: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        authHeader: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 3: Try Bearer token format
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          group: "day",
          dimensions: "date",
          metrics: "shows,clicks,partner_wo_nds",
          currency: "usd",
          lang: "en",
        },
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        bearerHeader: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        bearerHeader: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[Debug Yandex] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

