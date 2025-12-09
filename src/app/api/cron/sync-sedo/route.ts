/**
 * Sedo Cron Sync Endpoint
 * 
 * GET /api/cron/sync-sedo
 * 
 * Automated daily sync of Sedo data for all users.
 * Triggered by Vercel Cron at 5:00 AM UTC (9:00 AM Dubai).
 * 
 * Security: Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sedoClient } from "@/lib/sedo";
import { saveSedoRevenue, syncToOverviewReport, syncDomainsToAssignment } from "@/lib/revenue-db";

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

  // Get all users who have domain assignments (active users)
  // In a real system, you might have a flag for "sedo enabled" users
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  console.log(`[Cron] Found ${users.length} users to sync`);

  const results: Array<{
    userId: string;
    email: string;
    success: boolean;
    fetched?: number;
    saved?: number;
    updated?: number;
    overviewSynced?: number;
    domainsCreated?: number;
    error?: string;
  }> = [];

  // Fetch Sedo data once (it's the same for all users from the API)
  // Then save with each user's revShare settings
  const sedoData = await sedoClient.getRevenueData();
  
  // Also fetch domains for assignment sync
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

  // Save data for each user
  for (const user of users) {
    try {
      console.log(`[Cron] Syncing user: ${user.email}`);
      
      // Save to Bidder_Sedo
      const saveResult = await saveSedoRevenue(sedoData.data, user.id);
      
      // Auto-sync to Overview_Report
      const overviewResult = await syncToOverviewReport(user.id);
      
      // Sync domains to Domain_Assignment
      let domainsCreated = 0;
      if (sedoDomains.success && sedoDomains.domains.length > 0) {
        const domainResult = await syncDomainsToAssignment(user.id, sedoDomains.domains, "sedo", 80);
        domainsCreated = domainResult.created;
      }
      
      results.push({
        userId: user.id,
        email: user.email,
        success: true,
        fetched: sedoData.data.length,
        saved: saveResult.saved,
        updated: saveResult.updated,
        overviewSynced: overviewResult.synced,
        domainsCreated,
      });
    } catch (error) {
      console.error(`[Cron] Error syncing user ${user.email}:`, error);
      results.push({
        userId: user.id,
        email: user.email,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;

  console.log(`[Cron] Sync complete: ${successCount}/${users.length} users synced in ${duration}ms`);

  return NextResponse.json({
    success: true,
    message: "Sedo cron sync completed",
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    summary: {
      totalUsers: users.length,
      successfulSyncs: successCount,
      failedSyncs: users.length - successCount,
      recordsFetched: sedoData.data.length,
      domainsFetched: sedoDomains.domains?.length || 0,
      dateRange: sedoData.dateRange,
    },
    results,
  });
}

