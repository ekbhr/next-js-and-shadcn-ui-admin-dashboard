/**
 * Sedo Data Sync Endpoint
 * 
 * POST /api/reports/sedo/sync
 * 
 * Fetches data from Sedo API and saves to database.
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN based on Domain_Assignment.
 * - Each domain's data goes to the user who has that domain assigned
 * - Domains without assignment go to the admin (fallback)
 * - Regular users can only sync domains assigned to them
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sedoClient } from "@/lib/sedo";
import { saveSedoRevenue, getSedoRevenueSummary, syncToOverviewReport } from "@/lib/revenue-db";
import { isAdmin } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userIsAdmin = isAdmin((session.user as { role?: string }).role);

    // Check if Sedo API is configured
    const configStatus = sedoClient.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Sedo API is not configured",
          config: configStatus,
        },
        { status: 400 }
      );
    }

    // Parse request body for optional parameters
    let domain: string | undefined;
    try {
      const body = await request.json();
      domain = body.domain;
    } catch {
      // No body or invalid JSON - that's okay, use defaults
    }

    // Fetch data from Sedo API (last 31 days)
    console.log(`[Sedo Sync] Fetching data (initiated by user ${userId}, admin: ${userIsAdmin})...`);
    const sedoData = await sedoClient.getRevenueData({ domain });

    if (!sedoData.success || !sedoData.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: sedoData.error || "Failed to fetch Sedo data",
        },
        { status: 500 }
      );
    }

    // Save to database
    // Data is saved to the USER WHO OWNS THE DOMAIN (from Domain_Assignment)
    // - saveToDomainOwner: true = each domain's data goes to its owner
    // - filterByAssignedDomains: skip domains that aren't assigned to anyone (for non-admins)
    // - fallbackUserId: for unassigned domains, admin gets the data
    console.log(`[Sedo Sync] Saving ${sedoData.data.length} records to domain owners...`);
    const saveResult = await saveSedoRevenue(sedoData.data, userId, {
      saveToDomainOwner: true,
      filterByAssignedDomains: !userIsAdmin, // Non-admins only sync assigned domains
    });

    // Auto-sync to Overview Report (sync all users' data if admin, or just this user)
    console.log(`[Sedo Sync] Syncing to Overview Report...`);
    const overviewResult = await syncToOverviewReport(userIsAdmin ? null : userId);

    // Get updated summary (for the current user)
    const summary = await getSedoRevenueSummary(userId);

    return NextResponse.json({
      success: true,
      message: "Sedo data synced successfully",
      sync: {
        fetched: sedoData.data.length,
        saved: saveResult.saved,
        updated: saveResult.updated,
        skipped: saveResult.skipped,
        errors: saveResult.errors.length,
      },
      dateRange: sedoData.dateRange,
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
    console.error("[Sedo Sync] Error:", error);
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
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get summary from database
    const summary = await getSedoRevenueSummary(userId);

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
    console.error("[Sedo Sync] GET Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get summary",
      },
      { status: 500 }
    );
  }
}

