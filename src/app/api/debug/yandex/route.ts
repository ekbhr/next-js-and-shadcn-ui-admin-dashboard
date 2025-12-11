/**
 * Debug endpoint for Yandex API
 * 
 * Based on official docs: https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
 * 
 * Correct URL: https://partner.yandex.ru/api/statistics2/get.json
 * Required params: lang, period, field
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

    const results: Record<string, unknown> = {
      tokenPrefix: apiToken.substring(0, 10) + "...",
      tokenLength: apiToken.length,
      apiDocs: "https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2",
      tests: {},
    };

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log("[Debug] Testing Yandex API from", startDate, "to", endDate);

    // Correct API URL per official docs
    const API_URL = "https://partner.yandex.ru/api/statistics2/get.json";

    // Test 1: Using period=30days (predefined period)
    try {
      const response = await axios.get(API_URL, {
        params: {
          lang: "en",
          period: "30days",
          field: ["shows", "clicks", "partner_wo_nds"],
          pretty: 1,
        },
        paramsSerializer: { indexes: null },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        period30days: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        period30days: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 2: Using date range (period=date1&period=date2)
    try {
      const response = await axios.get(API_URL, {
        params: {
          lang: "en",
          period: [startDate, endDate],
          field: ["shows", "clicks", "partner_wo_nds"],
          pretty: 1,
        },
        paramsSerializer: { indexes: null },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        dateRange: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        dateRange: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 3: With dimension_field for date grouping
    try {
      const response = await axios.get(API_URL, {
        params: {
          lang: "en",
          period: "30days",
          field: ["shows", "clicks", "partner_wo_nds"],
          dimension_field: "date|day",
          pretty: 1,
        },
        paramsSerializer: { indexes: null },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        withDimension: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        withDimension: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 4: With entity_field for domain grouping
    try {
      const response = await axios.get(API_URL, {
        params: {
          lang: "en",
          period: "30days",
          field: ["shows", "clicks", "partner_wo_nds"],
          entity_field: "domain",
          pretty: 1,
        },
        paramsSerializer: { indexes: null },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        withEntityDomain: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        withEntityDomain: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 5: Full request with both dimension and entity
    try {
      const response = await axios.get(API_URL, {
        params: {
          lang: "en",
          period: "30days",
          field: ["shows", "clicks", "partner_wo_nds"],
          dimension_field: "date|day",
          entity_field: "domain",
          currency: "USD",
          pretty: 1,
        },
        paramsSerializer: { indexes: null },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        fullRequest: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        fullRequest: {
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
