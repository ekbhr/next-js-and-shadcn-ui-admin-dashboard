/**
 * Yandex Data Sync Endpoint
 * 
 * POST /api/reports/yandex/sync
 * 
 * Fetches data from Yandex API and saves to database.
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN based on Domain_Assignment.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { yandexClient } from "@/lib/yandex";
import { saveYandexRevenue, getYandexRevenueSummary, syncYandexToOverviewReport } from "@/lib/revenue-db";
import { isAdmin } from "@/lib/roles";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userIsAdmin = isAdmin((session.user as { role?: string }).role);

    // Check if Yandex API is configured
    const configStatus = yandexClient.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Yandex API is not configured",
          config: configStatus,
        },
        { status: 400 }
      );
    }

    // Fetch data from Yandex API
    console.log(`[Yandex Sync] Fetching data (initiated by user ${userId}, admin: ${userIsAdmin})...`);
    const yandexData = await yandexClient.getRevenueData();

    if (!yandexData.success || !yandexData.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: yandexData.error || "Failed to fetch Yandex data",
        },
        { status: 500 }
      );
    }

    // Save to database - data goes to domain owner
    console.log(`[Yandex Sync] Saving ${yandexData.data.length} records to domain owners...`);
    const saveResult = await saveYandexRevenue(yandexData.data, userId, {
      saveToDomainOwner: true,
      filterByAssignedDomains: !userIsAdmin,
    });

    // Sync to Overview Report
    console.log(`[Yandex Sync] Syncing to Overview Report...`);
    const overviewResult = await syncYandexToOverviewReport(userIsAdmin ? null : userId);

    // Get summary
    const summary = await getYandexRevenueSummary(userId);

    return NextResponse.json({
      success: true,
      message: "Yandex data synced successfully",
      sync: {
        fetched: yandexData.data.length,
        saved: saveResult.saved,
        updated: saveResult.updated,
        skipped: saveResult.skipped,
        errors: saveResult.errors.length,
      },
      dateRange: yandexData.dateRange,
      summary: {
        totalGrossRevenue: summary.totalGrossRevenue,
        totalNetRevenue: summary.totalNetRevenue,
        totalImpressions: summary.totalImpressions,
        totalClicks: summary.totalClicks,
        recordsInDb: summary.recordCount,
      },
      overview: {
        synced: overviewResult.synced,
        errors: overviewResult.errors.length,
      },
      errorDetails: saveResult.errors.length > 0 ? saveResult.errors : undefined,
    });
  } catch (error) {
    console.error("[Yandex Sync] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status / get summary
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const summary = await getYandexRevenueSummary(userId);

    return NextResponse.json({
      success: true,
      summary: {
        totalGrossRevenue: summary.totalGrossRevenue,
        totalNetRevenue: summary.totalNetRevenue,
        totalImpressions: summary.totalImpressions,
        totalClicks: summary.totalClicks,
        recordsInDb: summary.recordCount,
      },
    });
  } catch (error) {
    console.error("[Yandex Sync] GET Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get summary",
      },
      { status: 500 }
    );
  }
}

