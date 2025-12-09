/**
 * Domain Sync API Endpoint
 * 
 * POST /api/domains/sync
 * 
 * Fetches domains from Sedo and syncs them to Domain_Assignment table.
 * Creates new assignments with default revShare for new domains.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sedoClient } from "@/lib/sedo";
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

    // Fetch domains from Sedo
    const sedoDomains = await sedoClient.getDomains();

    if (!sedoDomains.success) {
      return NextResponse.json({
        success: false,
        error: sedoDomains.error || "Failed to fetch domains from Sedo",
      });
    }

    console.log(`[Domain Sync] Fetched ${sedoDomains.domains.length} domains from Sedo`);

    // Sync to Domain_Assignment table
    const result = await syncDomainsToAssignment(
      userId,
      sedoDomains.domains,
      "sedo",
      80 // Default revShare
    );

    // Get updated assignments
    const assignments = await getDomainAssignments(userId);

    return NextResponse.json({
      success: true,
      message: "Domains synced successfully",
      sync: {
        fetched: sedoDomains.domains.length,
        created: result.created,
        existing: result.existing,
        errors: result.errors.length,
      },
      domains: sedoDomains.domains,
      assignments: assignments.map((a) => ({
        id: a.id,
        domain: a.domain,
        network: a.network,
        revShare: a.revShare,
        isActive: a.isActive,
      })),
      errorDetails: result.errors.length > 0 ? result.errors : undefined,
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

