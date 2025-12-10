/**
 * Sedo Cron Sync Endpoint
 * 
 * GET /api/cron/sync-sedo
 * 
 * Automated daily sync of Sedo data.
 * Triggered by Vercel Cron at 5:00 AM UTC (9:00 AM Dubai).
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN.
 * - Fetches data from Sedo API once
 * - Each domain's data goes to the user who has that domain assigned
 * - Domains without assignment go to the first admin (fallback)
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sedoClient } from "@/lib/sedo";
import { saveSedoRevenue, syncToOverviewReport } from "@/lib/revenue-db";

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

  console.log("[Cron] Starting Sedo sync...");
  console.log(`[Cron] Time: ${new Date().toISOString()}`);

  // Check if Sedo API is configured
  const configStatus = sedoClient.getConfigStatus();
  if (!configStatus.configured) {
    console.error("[Cron] Sedo API not configured");
    return NextResponse.json({
      success: false,
      error: "Sedo API not configured",
      config: configStatus,
    });
  }

  try {
    // Find admin user to use as fallback for unassigned domains
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      console.error("[Cron] No admin user found - cannot sync");
      return NextResponse.json({
        success: false,
        error: "No admin user found. Please create an admin user first.",
      });
    }

    console.log(`[Cron] Using admin ${adminUser.email} as fallback for unassigned domains`);

    // Fetch Sedo data once
    const sedoData = await sedoClient.getRevenueData();
    
    // Also fetch domains for reference
    const sedoDomains = await sedoClient.getDomains();

    if (!sedoData.success || !sedoData.data) {
      console.error("[Cron] Failed to fetch Sedo data:", sedoData.error);
      return NextResponse.json({
        success: false,
        error: sedoData.error || "Failed to fetch Sedo data",
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron] Fetched ${sedoData.data.length} records from Sedo`);
    console.log(`[Cron] Fetched ${sedoDomains.domains?.length || 0} domains from Sedo`);

    // Save data ONCE - each record goes to the user who owns that domain
    // saveToDomainOwner: true = look up domain ownership and save to correct user
    // filterByAssignedDomains: false = for unassigned domains, use fallback (admin)
    console.log(`[Cron] Saving records to domain owners...`);
    const saveResult = await saveSedoRevenue(sedoData.data, adminUser.id, {
      saveToDomainOwner: true,
      filterByAssignedDomains: false, // Save all data, unassigned goes to admin
    });

    // Sync to Overview Report for ALL users (null = all users)
    console.log(`[Cron] Syncing to Overview Report for all users...`);
    const overviewResult = await syncToOverviewReport(null);

    const duration = Date.now() - startTime;

    console.log(`[Cron] Sync complete in ${duration}ms`);
    console.log(`[Cron] Results: ${saveResult.saved} saved, ${saveResult.updated} updated, ${saveResult.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: "Sedo cron sync completed",
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        recordsFetched: sedoData.data.length,
        recordsSaved: saveResult.saved,
        recordsUpdated: saveResult.updated,
        recordsSkipped: saveResult.skipped,
        overviewSynced: overviewResult.synced,
        domainsFetched: sedoDomains.domains?.length || 0,
        dateRange: sedoData.dateRange,
        errors: saveResult.errors.length + overviewResult.errors.length,
      },
      details: {
        saveErrors: saveResult.errors.length > 0 ? saveResult.errors.slice(0, 10) : undefined,
        overviewErrors: overviewResult.errors.length > 0 ? overviewResult.errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    });
  }
}

