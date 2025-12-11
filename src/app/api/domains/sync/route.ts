/**
 * Domain Sync API Endpoint
 * 
 * POST /api/domains/sync
 * 
 * Fetches domains from ALL configured networks (Sedo, Yandex) and syncs them to Domain_Assignment table.
 * Creates new assignments with default revShare for new domains.
 * 
 * Uses the centralized domains.ts library for orchestration.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { syncLimiter, getClientIp } from "@/lib/rate-limit";
import {
  syncAllNetworkDomains,
  getAllDomainAssignments,
  getNetworkStatus,
} from "@/lib/domains";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin only - domain sync affects all users
    if (!isAdmin((session.user as { role?: string }).role)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Rate limiting - sync is expensive operation
    const ip = getClientIp(request);
    const { success: rateLimitOk } = await syncLimiter.check(5, `domain-sync:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: "Too many sync requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const userId = session.user.id;
    console.log(`[Domain Sync] Starting for user: ${session.user.email}`);

    // Get network status
    const networkStatus = getNetworkStatus();
    console.log(`[Domain Sync] Network status:`, networkStatus);

    // Sync domains from all networks using centralized library
    // New domains are assigned to the current user (admin) by default
    const syncResult = await syncAllNetworkDomains(userId, 80); // Default 80% revShare

    // Build results by network
    const networks: Record<string, { fetched: number; created: number; existing: number; errors: number }> = {};
    for (const result of syncResult.results) {
      networks[result.network] = {
        fetched: result.fetched,
        created: result.created,
        existing: result.existing,
        errors: result.errors.length,
      };
    }

    // Get updated assignments (include unassigned for admin view)
    const assignments = await getAllDomainAssignments({ includeUnassigned: true });

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.success ? "Domains synced successfully" : "Sync completed with errors",
      sync: {
        fetched: syncResult.totalFetched,
        created: syncResult.totalCreated,
        existing: syncResult.totalExisting,
        errors: syncResult.totalErrors,
      },
      networks,
      networkStatus,
      assignments: assignments.map((a) => ({
        id: a.id,
        domain: a.domain,
        network: a.network,
        revShare: a.revShare,
        isActive: a.isActive,
        userId: a.userId,
        userName: a.userName,
        userEmail: a.userEmail,
      })),
    });
  } catch (error) {
    console.error("[Domain Sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/domains/sync
 * 
 * Returns current domain assignments and network status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get network status
    const networkStatus = getNetworkStatus();

    // Get assignments (include unassigned for admin view)
    const assignments = await getAllDomainAssignments({ includeUnassigned: true });

    return NextResponse.json({
      success: true,
      networkStatus,
      assignments: assignments.map((a) => ({
        id: a.id,
        domain: a.domain,
        network: a.network,
        revShare: a.revShare,
        isActive: a.isActive,
        userId: a.userId,
        userName: a.userName,
        userEmail: a.userEmail,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[Domain Sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

