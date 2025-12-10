/**
 * Debug endpoint to check Sedo API responses
 * GET /api/debug/sedo
 * 
 * Returns raw data from different Sedo API period options
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import axios from "axios";

export async function GET(request: Request) {
  try {
    // Temporary: Allow access with secret param for debugging
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    
    if (secret !== "debug-sedo-2024") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!isAdmin((session.user as { role?: string }).role)) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
    }

    const signKey = process.env.SEDO_SIGN_KEY;
    const partnerId = process.env.SEDO_PARTNER_ID;
    const username = process.env.SEDO_USERNAME;
    const password = process.env.SEDO_PASSWORD;
    const apiUrl = process.env.SEDO_API_URL || "https://api.sedo.com/api/v1";

    if (!signKey || !partnerId || !username || !password) {
      return NextResponse.json({
        error: "Sedo API not configured",
        config: {
          hasSignKey: !!signKey,
          hasPartnerId: !!partnerId,
          hasUsername: !!username,
          hasPassword: !!password,
        },
      });
    }

    const baseParams = {
      partnerid: partnerId,
      signkey: signKey,
      username: username,
      password: password,
      output_method: "xml",
      final: "false",
      startfrom: 0,
      results: 10, // Limit to 10 for debugging
    };

    // Test different periods
    const results: Record<string, unknown> = {};

    // Period 1: Day by day summary
    try {
      const response1 = await axios.get(`${apiUrl}/DomainParkingFinalStatistics`, {
        params: { ...baseParams, period: 1 },
        timeout: 30000,
        responseType: "text",
      });
      results.period1_dayByDay = {
        rawPreview: String(response1.data).substring(0, 2000),
        description: "Last 31 days - day by day summary",
      };
    } catch (e) {
      results.period1_dayByDay = { error: e instanceof Error ? e.message : "Failed" };
    }

    // Period 4: Domain summary
    try {
      const response4 = await axios.get(`${apiUrl}/DomainParkingFinalStatistics`, {
        params: { ...baseParams, period: 4 },
        timeout: 30000,
        responseType: "text",
      });
      results.period4_domainSummary = {
        rawPreview: String(response4.data).substring(0, 2000),
        description: "Last 31 days - domain summary",
      };
    } catch (e) {
      results.period4_domainSummary = { error: e instanceof Error ? e.message : "Failed" };
    }

    // Period 0: Single day (today)
    try {
      const today = new Date().toISOString().split("T")[0];
      const response0 = await axios.get(`${apiUrl}/DomainParkingFinalStatistics`, {
        params: { ...baseParams, period: 0, date: today },
        timeout: 30000,
        responseType: "text",
      });
      results.period0_singleDay = {
        rawPreview: String(response0.data).substring(0, 2000),
        description: `Single day (${today})`,
      };
    } catch (e) {
      results.period0_singleDay = { error: e instanceof Error ? e.message : "Failed" };
    }

    return NextResponse.json({
      success: true,
      apiUrl,
      results,
      note: "Check rawPreview to see what fields Sedo returns for each period type",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Debug failed" },
      { status: 500 }
    );
  }
}

