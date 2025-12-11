/**
 * Domain Sync API Endpoint
 * 
 * POST /api/domains/sync
 * 
 * Fetches domains from ALL configured networks (Sedo, Yandex) and syncs them to Domain_Assignment table.
 * Creates new assignments with default revShare for new domains.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sedoClient } from "@/lib/sedo";
import { yandexClient } from "@/lib/yandex";
import { syncDomainsToAssignment, getDomainAssignments } from "@/lib/revenue-db";

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log(`[Domain Sync] Starting for user: ${session.user.email}`);

    const results = {
      sedo: { fetched: 0, created: 0, existing: 0, errors: 0 },
      yandex: { fetched: 0, created: 0, existing: 0, errors: 0 },
    };

    // Fetch and sync Sedo domains
    if (sedoClient.isConfigured()) {
      console.log(`[Domain Sync] Fetching Sedo domains...`);
      const sedoDomains = await sedoClient.getDomains();

      if (sedoDomains.success && sedoDomains.domains.length > 0) {
        console.log(`[Domain Sync] Fetched ${sedoDomains.domains.length} domains from Sedo`);
        const sedoResult = await syncDomainsToAssignment(
          userId,
          sedoDomains.domains,
          "sedo",
          80
        );
        results.sedo = {
          fetched: sedoDomains.domains.length,
          created: sedoResult.created,
          existing: sedoResult.existing,
          errors: sedoResult.errors.length,
        };
      }
    } else {
      console.log(`[Domain Sync] Sedo not configured, skipping`);
    }

    // Fetch and sync Yandex domains
    if (yandexClient.isConfigured()) {
      console.log(`[Domain Sync] Fetching Yandex domains...`);
      const yandexDomains = await yandexClient.getDomains();

      if (yandexDomains.success && yandexDomains.domains.length > 0) {
        console.log(`[Domain Sync] Fetched ${yandexDomains.domains.length} domains from Yandex`);
        const yandexResult = await syncDomainsToAssignment(
          userId,
          yandexDomains.domains,
          "yandex",
          80
        );
        results.yandex = {
          fetched: yandexDomains.domains.length,
          created: yandexResult.created,
          existing: yandexResult.existing,
          errors: yandexResult.errors.length,
        };
      }
    } else {
      console.log(`[Domain Sync] Yandex not configured, skipping`);
    }

    // Get updated assignments
    const assignments = await getDomainAssignments(userId);

    // Calculate totals
    const totalFetched = results.sedo.fetched + results.yandex.fetched;
    const totalCreated = results.sedo.created + results.yandex.created;
    const totalExisting = results.sedo.existing + results.yandex.existing;
    const totalErrors = results.sedo.errors + results.yandex.errors;

    return NextResponse.json({
      success: true,
      message: "Domains synced successfully",
      sync: {
        fetched: totalFetched,
        created: totalCreated,
        existing: totalExisting,
        errors: totalErrors,
      },
      networks: results,
      assignments: assignments.map((a) => ({
        id: a.id,
        domain: a.domain,
        network: a.network,
        revShare: a.revShare,
        isActive: a.isActive,
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
 * Returns current domain assignments for the user
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

    const assignments = await getDomainAssignments(session.user.id);

    return NextResponse.json({
      success: true,
      assignments: assignments.map((a) => ({
        id: a.id,
        domain: a.domain,
        network: a.network,
        revShare: a.revShare,
        isActive: a.isActive,
        notes: a.notes,
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

