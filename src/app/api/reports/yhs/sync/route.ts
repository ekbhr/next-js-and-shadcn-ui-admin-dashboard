/**
 * YHS Data Sync Endpoint
 *
 * POST /api/reports/yhs/sync
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { yhsClient, createYhsClient } from "@/lib/yhs";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isYhsCredentials } from "@/lib/encryption";
import { syncLimiter, getClientIp } from "@/lib/rate-limit";
import { getYhsRevenueSummary, saveYhsRevenue, syncYhsToOverviewReport } from "@/lib/revenue-db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const userId = session.user.id;
    const userIsAdmin = isAdmin((session.user as { role?: string }).role);

    const ip = getClientIp(request);
    const { success: rateLimitOk } = await syncLimiter.check(5, `yhs-sync:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: "Too many sync requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const dbAccounts = await getActiveAccountsWithCredentials("yhs");
    const useEnvFallback = dbAccounts.length === 0 && yhsClient.isConfigured();
    if (dbAccounts.length === 0 && !useEnvFallback) {
      return NextResponse.json(
        { success: false, error: "No YHS accounts configured. Add an account in Admin Settings or set YHS_API_KEY." },
        { status: 400 }
      );
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
    let lastDateRange: { start: string; end: string } | undefined;

    for (const account of dbAccounts) {
      if (!isYhsCredentials(account.credentials)) {
        console.warn(`[YHS Sync] Invalid credentials for account ${account.name}`);
        continue;
      }

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

        const saveResult = await saveYhsRevenue(result.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
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
        lastDateRange = result.dateRange;
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
        const saveResult = await saveYhsRevenue(result.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
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
        lastDateRange = result.dateRange;
      }
    }

    const overviewResult = await syncYhsToOverviewReport(userIsAdmin ? null : userId);
    const summary = await getYhsRevenueSummary(userId);

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
      savedCount: totalSaved,
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const summary = await getYhsRevenueSummary(session.user.id);
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get summary" },
      { status: 500 }
    );
  }
}
