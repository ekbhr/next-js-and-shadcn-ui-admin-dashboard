/**
 * Sedo API Test Endpoint
 *
 * Use this endpoint to test Sedo API connectivity
 * GET/POST /api/reports/sedo/test
 */

import { NextResponse } from "next/server";
import { sedoClient } from "@/lib/sedo";

async function testSedoApi() {
  try {
    // Get configuration status
    const configStatus = sedoClient.getConfigStatus();

    if (!configStatus.configured) {
      return NextResponse.json({
        success: false,
        message: "Sedo API is not fully configured",
        config: {
          hasSignKey: configStatus.hasSignKey,
          hasPartnerId: configStatus.hasPartnerId,
          hasUsername: configStatus.hasUsername,
          hasPassword: configStatus.hasPassword,
          apiUrl: configStatus.apiUrl,
        },
        instructions: [
          "Add SEDO_PARTNER_ID to .env.local",
          "Add SEDO_SIGN_KEY to .env.local",
          "Add SEDO_USERNAME to .env.local",
          "Add SEDO_PASSWORD to .env.local",
          "Restart the development server",
        ],
      });
    }

    // Test API connection - fetches last 31 days from Sedo
    const result = await sedoClient.getRevenueData();

    return NextResponse.json({
      success: true,
      message: "Sedo API connection test completed",
      config: {
        hasSignKey: configStatus.hasSignKey,
        hasPartnerId: configStatus.hasPartnerId,
        hasUsername: configStatus.hasUsername,
        hasPassword: configStatus.hasPassword,
        apiUrl: configStatus.apiUrl,
      },
      testResult: {
        dataReturned: result.success,
        recordCount: result.data?.length || 0,
        dateRange: result.dateRange,
        totalRevenue: result.totalRevenue,
        totalClicks: result.totalClicks,
        totalImpressions: result.totalImpressions,
        data: result.data, // Full data - no truncation
      },
    });
  } catch (error) {
    console.error("Sedo API test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Sedo API test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Support both GET and POST requests
export async function GET() {
  return testSedoApi();
}

export async function POST() {
  return testSedoApi();
}

