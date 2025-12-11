/**
 * Yandex Cron Sync Endpoint
 * 
 * GET /api/cron/sync-yandex
 * 
 * Automated daily sync of Yandex data.
 * Triggered by Vercel Cron at 6:00 AM UTC (10:00 AM Dubai).
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN.
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yandexClient } from "@/lib/yandex";
import { saveYandexRevenue, syncYandexToOverviewReport } from "@/lib/revenue-db";

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

  // Check if Yandex API is configured
  const configStatus = yandexClient.getConfigStatus();
  if (!configStatus.configured) {
    console.error("[Yandex Cron] API not configured");
    return NextResponse.json({
      success: false,
      error: "Yandex API not configured",
      config: configStatus,
    });
  }

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

    // Fetch Yandex data
    const yandexData = await yandexClient.getRevenueData();
    const yandexDomains = await yandexClient.getDomains();

    if (!yandexData.success || !yandexData.data) {
      console.error("[Yandex Cron] Failed to fetch data:", yandexData.error);
      return NextResponse.json({
        success: false,
        error: yandexData.error || "Failed to fetch Yandex data",
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Yandex Cron] Fetched ${yandexData.data.length} records`);
    console.log(`[Yandex Cron] Fetched ${yandexDomains.domains?.length || 0} domains`);

    // Save data to domain owners
    console.log(`[Yandex Cron] Saving records to domain owners...`);
    const saveResult = await saveYandexRevenue(yandexData.data, adminUser.id, {
      saveToDomainOwner: true,
      filterByAssignedDomains: false,
    });

    // Sync to Overview Report
    console.log(`[Yandex Cron] Syncing to Overview Report...`);
    const overviewResult = await syncYandexToOverviewReport(null);

    const duration = Date.now() - startTime;

    console.log(`[Yandex Cron] Sync complete in ${duration}ms`);
    console.log(`[Yandex Cron] Results: ${saveResult.saved} saved, ${saveResult.updated} updated, ${saveResult.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: "Yandex cron sync completed",
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        recordsFetched: yandexData.data.length,
        recordsSaved: saveResult.saved,
        recordsUpdated: saveResult.updated,
        recordsSkipped: saveResult.skipped,
        overviewSynced: overviewResult.synced,
        domainsFetched: yandexDomains.domains?.length || 0,
        dateRange: yandexData.dateRange,
        errors: saveResult.errors.length + overviewResult.errors.length,
      },
      details: {
        saveErrors: saveResult.errors.length > 0 ? saveResult.errors.slice(0, 10) : undefined,
        overviewErrors: overviewResult.errors.length > 0 ? overviewResult.errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error("[Yandex Cron] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    });
  }
}

