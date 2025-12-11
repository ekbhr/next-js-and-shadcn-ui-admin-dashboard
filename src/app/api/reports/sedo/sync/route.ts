/**
 * Sedo Data Sync Endpoint
 * 
 * POST /api/reports/sedo/sync
 * 
 * Fetches data from Sedo API and saves to database.
 * 
 * MULTI-ACCOUNT SUPPORT:
 * - First checks for database-stored accounts (NetworkAccount table)
 * - Falls back to environment variables if no DB accounts exist
 * - Loops over all active accounts and syncs data from each
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN based on Domain_Assignment.
 * - Each domain's data goes to the user who has that domain assigned
 * - Domains without assignment go to the admin (fallback)
 * - Regular users can only sync domains assigned to them
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sedoClient, createSedoClient } from "@/lib/sedo";
import { saveSedoRevenue, getSedoRevenueSummary, syncToOverviewReport } from "@/lib/revenue-db";
import { isAdmin } from "@/lib/roles";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isSedoCredentials } from "@/lib/encryption";
import { syncLimiter, getClientIp } from "@/lib/rate-limit";

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

    // Rate limiting - sync is expensive
    const ip = getClientIp(request);
    const { success: rateLimitOk } = await syncLimiter.check(5, `sedo-sync:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: "Too many sync requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Parse request body for optional parameters
    let domain: string | undefined;
    let accountId: string | undefined;
    try {
      const body = await request.json();
      domain = body.domain;
      accountId = body.accountId; // Optional: sync specific account only
    } catch {
      // No body or invalid JSON - that's okay, use defaults
    }

    // Get accounts to sync
    // Priority: 1) Database accounts, 2) Environment variables
    let dbAccounts = await getActiveAccountsWithCredentials("sedo");
    
    // Filter to specific account if requested
    if (accountId) {
      dbAccounts = dbAccounts.filter(acc => acc.id === accountId);
    }
    
    const useEnvFallback = dbAccounts.length === 0 && sedoClient.isConfigured();
    
    if (dbAccounts.length === 0 && !useEnvFallback) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No Sedo accounts configured. Add an account in Admin Settings or set environment variables.",
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
      if (!isSedoCredentials(account.credentials)) {
        console.warn(`[Sedo Sync] Invalid credentials for account ${account.name}`);
        continue;
      }

      console.log(`[Sedo Sync] Syncing account: ${account.name} (${account.id})`);
      
      try {
        const client = createSedoClient(account.credentials, {
          accountId: account.id,
          accountName: account.name,
        });

        const sedoData = await client.getRevenueData({ domain });

        if (!sedoData.success || !sedoData.data) {
          accountResults.push({
            accountId: account.id,
            accountName: account.name,
            fetched: 0,
            saved: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            error: sedoData.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        // Save with accountId
        const saveResult = await saveSedoRevenue(sedoData.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
          accountId: account.id,
        });

        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: sedoData.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += sedoData.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
        lastDateRange = sedoData.dateRange;
      } catch (error) {
        console.error(`[Sedo Sync] Error syncing account ${account.name}:`, error);
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
      console.log("[Sedo Sync] Using environment variable credentials (legacy mode)");
      
      try {
        const sedoData = await sedoClient.getRevenueData({ domain });

        if (sedoData.success && sedoData.data) {
          const saveResult = await saveSedoRevenue(sedoData.data, userId, {
            saveToDomainOwner: true,
            filterByAssignedDomains: !userIsAdmin,
          });

          accountResults.push({
            accountId: null,
            accountName: "Environment Variables (Legacy)",
            fetched: sedoData.data.length,
            saved: saveResult.saved,
            updated: saveResult.updated,
            skipped: saveResult.skipped,
            errors: saveResult.errors.length,
          });

          totalFetched += sedoData.data.length;
          totalSaved += saveResult.saved;
          totalUpdated += saveResult.updated;
          totalSkipped += saveResult.skipped;
          totalErrors += saveResult.errors.length;
          lastDateRange = sedoData.dateRange;
        }
      } catch (error) {
        console.error("[Sedo Sync] Error syncing from env vars:", error);
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

    // Auto-sync to Overview Report
    console.log(`[Sedo Sync] Syncing to Overview Report...`);
    const overviewResult = await syncToOverviewReport(userIsAdmin ? null : userId);

    // Get updated summary
    const summary = await getSedoRevenueSummary(userId);

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

