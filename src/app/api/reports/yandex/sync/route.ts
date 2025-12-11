/**
 * Yandex Data Sync Endpoint
 * 
 * POST /api/reports/yandex/sync
 * 
 * Fetches data from Yandex API and saves to database.
 * 
 * MULTI-ACCOUNT SUPPORT:
 * - First checks for database-stored accounts (NetworkAccount table)
 * - Falls back to environment variables if no DB accounts exist
 * - Loops over all active accounts and syncs data from each
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN based on Domain_Assignment.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { yandexClient, createYandexClient } from "@/lib/yandex";
import { saveYandexRevenue, getYandexRevenueSummary, syncYandexToOverviewReport } from "@/lib/revenue-db";
import { isAdmin } from "@/lib/roles";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isYandexCredentials } from "@/lib/encryption";

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

    // Get accounts to sync
    // Priority: 1) Database accounts, 2) Environment variables
    let dbAccounts = await getActiveAccountsWithCredentials("yandex");
    const useEnvFallback = dbAccounts.length === 0 && yandexClient.isConfigured();
    
    if (dbAccounts.length === 0 && !useEnvFallback) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No Yandex accounts configured. Add an account in Admin Settings or set YANDEX_API environment variable.",
        },
        { status: 400 }
      );
    }

    // Track results across all accounts
    const accountResults: Array<{
      accountId: string | null;
      accountName: string;
      fetched: number;
      saved: number;
      updated: number;
      skipped: number;
      errors: number;
      error?: string;
    }> = [];

    let totalFetched = 0;
    let totalSaved = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let lastDateRange: { start: string; end: string } | undefined;

    // Sync from database accounts
    for (const account of dbAccounts) {
      if (!isYandexCredentials(account.credentials)) {
        console.warn(`[Yandex Sync] Invalid credentials for account ${account.name}`);
        continue;
      }

      console.log(`[Yandex Sync] Syncing account: ${account.name} (${account.id})`);
      
      try {
        const client = createYandexClient(account.credentials, {
          accountId: account.id,
          accountName: account.name,
        });

        const yandexData = await client.getRevenueData();

        if (!yandexData.success || !yandexData.data) {
          accountResults.push({
            accountId: account.id,
            accountName: account.name,
            fetched: 0,
            saved: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            error: yandexData.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        // Save with accountId
        const saveResult = await saveYandexRevenue(yandexData.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
          accountId: account.id,
        });

        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: yandexData.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += yandexData.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
        lastDateRange = yandexData.dateRange;
      } catch (error) {
        console.error(`[Yandex Sync] Error syncing account ${account.name}:`, error);
        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: 0,
          saved: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        totalErrors++;
      }
    }

    // Fallback to environment variables if no DB accounts
    if (useEnvFallback) {
      console.log("[Yandex Sync] Using environment variable credentials (legacy mode)");
      
      try {
        const yandexData = await yandexClient.getRevenueData();

        if (yandexData.success && yandexData.data) {
          const saveResult = await saveYandexRevenue(yandexData.data, userId, {
            saveToDomainOwner: true,
            filterByAssignedDomains: !userIsAdmin,
          });

          accountResults.push({
            accountId: null,
            accountName: "Environment Variables (Legacy)",
            fetched: yandexData.data.length,
            saved: saveResult.saved,
            updated: saveResult.updated,
            skipped: saveResult.skipped,
            errors: saveResult.errors.length,
          });

          totalFetched += yandexData.data.length;
          totalSaved += saveResult.saved;
          totalUpdated += saveResult.updated;
          totalSkipped += saveResult.skipped;
          totalErrors += saveResult.errors.length;
          lastDateRange = yandexData.dateRange;
        }
      } catch (error) {
        console.error("[Yandex Sync] Error syncing from env vars:", error);
        accountResults.push({
          accountId: null,
          accountName: "Environment Variables (Legacy)",
          fetched: 0,
          saved: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        totalErrors++;
      }
    }

    // Sync to Overview Report
    console.log(`[Yandex Sync] Syncing to Overview Report...`);
    const overviewResult = await syncYandexToOverviewReport(userIsAdmin ? null : userId);

    // Get summary
    const summary = await getYandexRevenueSummary(userId);

    return NextResponse.json({
      success: totalErrors === 0 || totalSaved > 0,
      message: `Synced ${accountResults.length} account(s)`,
      accounts: accountResults,
      sync: {
        fetched: totalFetched,
        saved: totalSaved,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
      },
      dateRange: lastDateRange,
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

