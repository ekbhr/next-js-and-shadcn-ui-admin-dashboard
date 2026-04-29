/**
 * YHS Cron Sync Endpoint
 *
 * GET /api/cron/sync-yhs
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yhsClient, createYhsClient } from "@/lib/yhs";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isYhsCredentials } from "@/lib/encryption";
import { saveYhsRevenue, syncYhsToOverviewReport } from "@/lib/revenue-db";
import { notifySyncFailure } from "@/lib/notifications";
import { updateLastSync } from "@/lib/settings";

function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "development") return true;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, email: true },
    });
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: "No admin user found. Please create an admin user first.",
      });
    }

    const dbAccounts = await getActiveAccountsWithCredentials("yhs");
    const useEnvFallback = dbAccounts.length === 0 && yhsClient.isConfigured();
    if (dbAccounts.length === 0 && !useEnvFallback) {
      return NextResponse.json({
        success: false,
        error: "No YHS accounts configured. Add accounts in Admin Settings or set YHS_API_KEY.",
      });
    }

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

    for (const account of dbAccounts) {
      if (!isYhsCredentials(account.credentials)) continue;

      try {
        const client = createYhsClient(account.credentials, {
          accountId: account.id,
          accountName: account.name,
        });
        const result = await client.getRevenueData();

        if (!result.success || !result.data) {
          accountResults.push({
            accountId: account.id,
            accountName: account.name,
            fetched: 0,
            saved: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            error: result.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        const saveResult = await saveYhsRevenue(result.data, adminUser.id, {
          saveToDomainOwner: true,
          filterByAssignedDomains: false,
          accountId: account.id,
        });

        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: result.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += result.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
      } catch (error) {
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

    if (useEnvFallback) {
      const result = await yhsClient.getRevenueData();
      if (result.success && result.data) {
        const saveResult = await saveYhsRevenue(result.data, adminUser.id, {
          saveToDomainOwner: true,
          filterByAssignedDomains: false,
        });

        accountResults.push({
          accountId: null,
          accountName: "Environment Variables (Legacy)",
          fetched: result.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += result.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
      } else {
        totalErrors++;
      }
    }

    const overviewResult = await syncYhsToOverviewReport(null);
    await updateLastSync("yhs");

    if (totalErrors > 0) {
      await notifySyncFailure("YHS", `Sync completed with ${totalErrors} errors`, {
        timestamp: new Date(),
        additionalInfo: `Accounts synced: ${accountResults.length}`,
      });
    }

    return NextResponse.json({
      success: totalErrors === 0 || totalSaved > 0,
      message: `YHS cron sync completed - ${accountResults.length} account(s)`,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`,
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
    await notifySyncFailure("YHS", errorMsg, {
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
