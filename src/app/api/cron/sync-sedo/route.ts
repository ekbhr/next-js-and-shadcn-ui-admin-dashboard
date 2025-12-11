/**
 * Sedo Cron Sync Endpoint
 * 
 * GET /api/cron/sync-sedo
 * 
 * Automated daily sync of Sedo data.
 * Triggered by Vercel Cron at 5:00 AM UTC (9:00 AM Dubai).
 * 
 * MULTI-ACCOUNT SUPPORT:
 * - Checks for database-stored accounts first (NetworkAccount)
 * - Falls back to environment variables if no DB accounts
 * - Loops over all active accounts
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN.
 * - Each domain's data goes to the user who has that domain assigned
 * - Domains without assignment go to the first admin (fallback)
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sedoClient, createSedoClient } from "@/lib/sedo";
import { saveSedoRevenue, syncToOverviewReport } from "@/lib/revenue-db";
import { notifySyncFailure } from "@/lib/notifications";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isSedoCredentials } from "@/lib/encryption";

// Verify cron request is from Vercel
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // In development, allow without secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // In production, require CRON_SECRET
  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not set - cron jobs disabled in production");
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // Verify this is a legitimate cron request
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("[Sedo Cron] Starting sync...");
  console.log(`[Sedo Cron] Time: ${new Date().toISOString()}`);

  try {
    // Find admin user to use as fallback for unassigned domains
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      console.error("[Sedo Cron] No admin user found - cannot sync");
      return NextResponse.json({
        success: false,
        error: "No admin user found. Please create an admin user first.",
      });
    }

    console.log(`[Sedo Cron] Using admin ${adminUser.email} as fallback`);

    // Get accounts to sync - check DB first, then env vars
    const dbAccounts = await getActiveAccountsWithCredentials("sedo");
    const useEnvFallback = dbAccounts.length === 0 && sedoClient.isConfigured();

    if (dbAccounts.length === 0 && !useEnvFallback) {
      console.error("[Sedo Cron] No accounts configured");
      return NextResponse.json({
        success: false,
        error: "No Sedo accounts configured. Add accounts in Admin Settings or set environment variables.",
      });
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

    // Sync from database accounts
    for (const account of dbAccounts) {
      if (!isSedoCredentials(account.credentials)) {
        console.warn(`[Sedo Cron] Invalid credentials for account ${account.name}`);
        continue;
      }

      console.log(`[Sedo Cron] Syncing account: ${account.name}`);
      
      try {
        const client = createSedoClient(account.credentials, {
          accountId: account.id,
          accountName: account.name,
        });

        const sedoData = await client.getRevenueData();

        if (!sedoData.success || !sedoData.data) {
          accountResults.push({
            accountId: account.id,
            accountName: account.name,
            fetched: 0, saved: 0, updated: 0, skipped: 0, errors: 1,
            error: sedoData.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        const saveResult = await saveSedoRevenue(sedoData.data, adminUser.id, {
          saveToDomainOwner: true,
          filterByAssignedDomains: false,
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
      } catch (error) {
        console.error(`[Sedo Cron] Error syncing account ${account.name}:`, error);
        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: 0, saved: 0, updated: 0, skipped: 0, errors: 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        totalErrors++;
      }
    }

    // Fallback to environment variables if no DB accounts
    if (useEnvFallback) {
      console.log("[Sedo Cron] Using environment variable credentials (legacy mode)");
      
      try {
        const sedoData = await sedoClient.getRevenueData();

        if (sedoData.success && sedoData.data) {
          const saveResult = await saveSedoRevenue(sedoData.data, adminUser.id, {
            saveToDomainOwner: true,
            filterByAssignedDomains: false,
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
        }
      } catch (error) {
        console.error("[Sedo Cron] Error syncing from env vars:", error);
        totalErrors++;
      }
    }

    // Sync to Overview Report for ALL users
    console.log(`[Sedo Cron] Syncing to Overview Report...`);
    const overviewResult = await syncToOverviewReport(null);

    const duration = Date.now() - startTime;

    // Notify if there were errors
    if (totalErrors > 0) {
      await notifySyncFailure("Sedo", `Sync completed with ${totalErrors} errors`, {
        timestamp: new Date(),
        additionalInfo: `Accounts synced: ${accountResults.length}`,
      });
    }

    console.log(`[Sedo Cron] Sync complete in ${duration}ms`);
    console.log(`[Sedo Cron] Results: ${totalSaved} saved, ${totalUpdated} updated, ${totalSkipped} skipped`);

    return NextResponse.json({
      success: totalErrors === 0 || totalSaved > 0,
      message: `Sedo cron sync completed - ${accountResults.length} account(s)`,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      accounts: accountResults,
      summary: {
        accountsProcessed: accountResults.length,
        recordsFetched: totalFetched,
        recordsSaved: totalSaved,
        recordsUpdated: totalUpdated,
        recordsSkipped: totalSkipped,
        overviewSynced: overviewResult.synced,
        errors: totalErrors,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sedo Cron] Error:", error);
    
    await notifySyncFailure("Sedo", errorMsg, {
      timestamp: new Date(),
      additionalInfo: "Unexpected error during cron sync",
    });
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      duration: Date.now() - startTime,
    });
  }
}

