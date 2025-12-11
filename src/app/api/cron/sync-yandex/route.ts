/**
 * Yandex Cron Sync Endpoint
 * 
 * GET /api/cron/sync-yandex
 * 
 * Automated daily sync of Yandex data.
 * Triggered by Vercel Cron at 6:00 AM UTC (10:00 AM Dubai).
 * 
 * MULTI-ACCOUNT SUPPORT:
 * - Checks for database-stored accounts first (NetworkAccount)
 * - Falls back to environment variables if no DB accounts
 * - Loops over all active accounts
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN.
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yandexClient, createYandexClient } from "@/lib/yandex";
import { saveYandexRevenue, syncYandexToOverviewReport } from "@/lib/revenue-db";
import { notifySyncFailure } from "@/lib/notifications";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isYandexCredentials } from "@/lib/encryption";

// Verify cron request is from Vercel
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  if (!cronSecret) {
    console.warn("[Yandex Cron] CRON_SECRET not set - cron jobs disabled in production");
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("[Yandex Cron] Starting sync...");
  console.log(`[Yandex Cron] Time: ${new Date().toISOString()}`);

  try {
    // Find admin user as fallback
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      console.error("[Yandex Cron] No admin user found");
      return NextResponse.json({
        success: false,
        error: "No admin user found. Please create an admin user first.",
      });
    }

    console.log(`[Yandex Cron] Using admin ${adminUser.email} as fallback`);

    // Get accounts to sync - check DB first, then env vars
    const dbAccounts = await getActiveAccountsWithCredentials("yandex");
    const useEnvFallback = dbAccounts.length === 0 && yandexClient.isConfigured();

    if (dbAccounts.length === 0 && !useEnvFallback) {
      console.error("[Yandex Cron] No accounts configured");
      return NextResponse.json({
        success: false,
        error: "No Yandex accounts configured. Add accounts in Admin Settings or set YANDEX_API environment variable.",
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
      if (!isYandexCredentials(account.credentials)) {
        console.warn(`[Yandex Cron] Invalid credentials for account ${account.name}`);
        continue;
      }

      console.log(`[Yandex Cron] Syncing account: ${account.name}`);
      
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
            fetched: 0, saved: 0, updated: 0, skipped: 0, errors: 1,
            error: yandexData.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        const saveResult = await saveYandexRevenue(yandexData.data, adminUser.id, {
          saveToDomainOwner: true,
          filterByAssignedDomains: false,
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
      } catch (error) {
        console.error(`[Yandex Cron] Error syncing account ${account.name}:`, error);
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
      console.log("[Yandex Cron] Using environment variable credentials (legacy mode)");
      
      try {
        const yandexData = await yandexClient.getRevenueData();

        if (yandexData.success && yandexData.data) {
          const saveResult = await saveYandexRevenue(yandexData.data, adminUser.id, {
            saveToDomainOwner: true,
            filterByAssignedDomains: false,
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
        }
      } catch (error) {
        console.error("[Yandex Cron] Error syncing from env vars:", error);
        totalErrors++;
      }
    }

    // Sync to Overview Report
    console.log(`[Yandex Cron] Syncing to Overview Report...`);
    const overviewResult = await syncYandexToOverviewReport(null);

    const duration = Date.now() - startTime;

    // Notify if there were errors
    if (totalErrors > 0) {
      await notifySyncFailure("Yandex", `Sync completed with ${totalErrors} errors`, {
        timestamp: new Date(),
        additionalInfo: `Accounts synced: ${accountResults.length}`,
      });
    }

    console.log(`[Yandex Cron] Sync complete in ${duration}ms`);
    console.log(`[Yandex Cron] Results: ${totalSaved} saved, ${totalUpdated} updated, ${totalSkipped} skipped`);

    return NextResponse.json({
      success: totalErrors === 0 || totalSaved > 0,
      message: `Yandex cron sync completed - ${accountResults.length} account(s)`,
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
    console.error("[Yandex Cron] Error:", error);
    
    await notifySyncFailure("Yandex", errorMsg, {
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

