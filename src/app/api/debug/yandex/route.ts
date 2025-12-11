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

    // Test 2: period=1 (numeric day)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
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
        period1: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        period1: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 3: period=0 (total/summary)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 0,
          field: "shows,clicks,partner_wo_nds",
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
        period0: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        period0: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 4: Without period at all (maybe optional?)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          field: "date,domain,shows,clicks,partner_wo_nds",
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
        noPeriod: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        noPeriod: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 5: period=daily (string variant)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: "daily",
          field: "date,shows,clicks,partner_wo_nds",
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
        periodDaily: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        periodDaily: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 6: group_by instead of period (alternative API)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          group_by: "date",
          field: "date,shows,clicks,partner_wo_nds",
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
        groupBy: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        groupBy: {
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

