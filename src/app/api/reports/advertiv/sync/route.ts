/**
 * Advertiv (Yahoo) Data Sync Endpoint
 *
 * POST /api/reports/advertiv/sync
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { advertivClient, createAdvertivClient } from "@/lib/advertiv";
import { getAdvertivRevenueSummary, saveAdvertivRevenue, syncAdvertivToOverviewReport } from "@/lib/revenue-db";
import { isAdmin } from "@/lib/roles";
import { getActiveAccountsWithCredentials } from "@/lib/network-accounts";
import { isAdvertivCredentials } from "@/lib/encryption";
import { syncLimiter, getClientIp } from "@/lib/rate-limit";
import { updateLastSync } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const userId = session.user.id;
    const userIsAdmin = isAdmin((session.user as { role?: string }).role);

    const ip = getClientIp(request);
    const { success: rateLimitOk } = await syncLimiter.check(5, `advertiv-sync:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: "Too many sync requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    let accountId: string | undefined;
    try {
      const body = await request.json();
      accountId = body.accountId;
    } catch {
      // no-op
    }

    let dbAccounts = await getActiveAccountsWithCredentials("advertiv");
    if (accountId) {
      dbAccounts = dbAccounts.filter((acc) => acc.id === accountId);
    }

    const useEnvFallback = dbAccounts.length === 0 && advertivClient.isConfigured();
    if (dbAccounts.length === 0 && !useEnvFallback) {
      return NextResponse.json(
        {
          success: false,
          error: "No Yahoo accounts configured. Add an account in Admin Settings or set ADVERTIV_API_KEY.",
        },
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
      if (!isAdvertivCredentials(account.credentials)) {
        continue;
      }

      try {
        const client = createAdvertivClient(account.credentials, {
          accountId: account.id,
          accountName: account.name,
        });
        const response = await client.getRevenueData();

        if (!response.success || !response.data) {
          accountResults.push({
            accountId: account.id,
            accountName: account.name,
            fetched: 0,
            saved: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            error: response.error || "Failed to fetch data",
          });
          totalErrors++;
          continue;
        }

        const saveResult = await saveAdvertivRevenue(response.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
          accountId: account.id,
        });

        accountResults.push({
          accountId: account.id,
          accountName: account.name,
          fetched: response.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += response.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
        lastDateRange = response.dateRange;
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
      const response = await advertivClient.getRevenueData();
      if (response.success && response.data) {
        const saveResult = await saveAdvertivRevenue(response.data, userId, {
          saveToDomainOwner: true,
          filterByAssignedDomains: !userIsAdmin,
        });

        accountResults.push({
          accountId: null,
          accountName: "Environment Variables (Legacy)",
          fetched: response.data.length,
          saved: saveResult.saved,
          updated: saveResult.updated,
          skipped: saveResult.skipped,
          errors: saveResult.errors.length,
        });

        totalFetched += response.data.length;
        totalSaved += saveResult.saved;
        totalUpdated += saveResult.updated;
        totalSkipped += saveResult.skipped;
        totalErrors += saveResult.errors.length;
        lastDateRange = response.dateRange;
      } else {
        totalErrors++;
      }
    }

    const overviewResult = await syncAdvertivToOverviewReport(userIsAdmin ? null : userId);
    await updateLastSync("advertiv");
    const summary = await getAdvertivRevenueSummary(userId);

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
      savedCount: totalSaved,
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
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

    const summary = await getAdvertivRevenueSummary(session.user.id);
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
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get summary",
      },
      { status: 500 }
    );
  }
}
