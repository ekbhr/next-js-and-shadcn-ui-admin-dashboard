/**
 * Temporary cleanup endpoint - removes duplicate domain assignments
 * Keeps only the first assignment per domain (by createdAt)
 * DELETE THIS FILE AFTER USE
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== "cleanup-2024") {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  try {
    // Get all domain assignments grouped by domain+network
    const assignments = await prisma.domain_Assignment.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Group by domain+network
    const groups = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const key = `${a.domain}_${a.network}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(a);
    }

    // Find duplicates (groups with more than 1 assignment)
    const toDelete: string[] = [];
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Keep the first one, delete the rest
        for (let i = 1; i < group.length; i++) {
          toDelete.push(group[i].id);
        }
      }
    }

    // Also remove assignments where domain is null (old defaults)
    const nullDomains = await prisma.domain_Assignment.findMany({
      where: { domain: null },
    });
    for (const a of nullDomains) {
      toDelete.push(a.id);
    }

    // Delete duplicates
    if (toDelete.length > 0) {
      await prisma.domain_Assignment.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${toDelete.length} duplicate/null domain assignments`,
      deleted: toDelete.length,
      remaining: assignments.length - toDelete.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 }
    );
  }
}

