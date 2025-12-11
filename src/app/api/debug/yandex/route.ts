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

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log("[Debug] Testing Yandex API from", startDate, "to", endDate);

    // Test 1: Try partner.yandex.ru (without 2)
    try {
      const response = await axios.get("https://partner.yandex.ru/api/statistics/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
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
        partnerYandexRu: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        partnerYandexRu: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 2: Try partner2.yandex.com (international)
    try {
      const response = await axios.get("https://partner2.yandex.com/api/statistics2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
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
        partner2YandexCom: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        partner2YandexCom: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 3: Try an.yandex.ru (Advertising Network)
    try {
      const response = await axios.get("https://an.yandex.ru/partner/stat/api/json", {
        params: {
          date1: startDate,
          date2: endDate,
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
        anYandexRu: {
          status: response.status,
          statusText: response.statusText,
          data: typeof response.data === 'string' ? response.data.substring(0, 500) : response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        anYandexRu: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 4: Try page/list endpoint to see available sites
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/page/list.json", {
        params: {
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
        pageList: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        pageList: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 5: statistics2/get with XML format
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistics2/get.xml", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
          lang: "en",
        },
        headers: {
          Accept: "application/xml",
          Authorization: `OAuth ${apiToken}`,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      results.tests = {
        ...results.tests as object,
        xmlFormat: {
          status: response.status,
          statusText: response.statusText,
          data: typeof response.data === 'string' ? response.data.substring(0, 500) : response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        xmlFormat: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 6: List of available API methods
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/help.json", {
        params: {
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
        apiHelp: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        apiHelp: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 7: Try statistic2 (notice: no 's') 
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/statistic2/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
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
        statistic2: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        statistic2: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }

    // Test 8: Try stat/get (different naming)
    try {
      const response = await axios.get("https://partner2.yandex.ru/api/stat/get.json", {
        params: {
          date1: startDate,
          date2: endDate,
          period: 1,
          field: "date,shows,clicks,partner_wo_nds",
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
        statGet: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests as object,
        statGet: {
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
