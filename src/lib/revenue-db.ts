/**
 * Revenue Database Operations
 * 
 * Handles saving and retrieving revenue data from the database.
 * Supports upsert logic (update if exists, insert if new).
 * 
 * OPTIMIZED: Uses caching for frequently accessed data
 */

import { prisma } from "@/lib/prisma";
import { cache, CacheKeys, CacheTTL } from "@/lib/cache";
import type { SedoRevenueData } from "@/lib/sedo";
import type { YandexRevenueData } from "@/lib/yandex";

// Default revShare if no assignment found
const DEFAULT_REV_SHARE = 80;

/**
 * Get revShare for a specific domain/network combination
 * Since domain is now required, we only check for exact match or use default
 */
export async function getRevShare(
  userId: string,
  domain: string | null,
  network: string
): Promise<number> {
  // Try exact match (domain + network)
  if (domain) {
    const exactMatch = await prisma.domain_Assignment.findFirst({
      where: { domain, network, isActive: true },
    });
    if (exactMatch) return exactMatch.revShare;
  }

  // Fall back to system default
  return DEFAULT_REV_SHARE;
}

/**
 * OPTIMIZED: Get all domain assignments in one query
 * Returns a Map of domain -> { userId, revShare }
 * This eliminates N+1 queries when saving revenue data
 */
export async function getAllDomainAssignmentsMap(
  network: string
): Promise<Map<string, { userId: string; revShare: number }>> {
  const assignments = await prisma.domain_Assignment.findMany({
    where: { network, isActive: true },
    select: { domain: true, userId: true, revShare: true },
  });

  const map = new Map<string, { userId: string; revShare: number }>();
  for (const a of assignments) {
    map.set(a.domain.toLowerCase().trim(), {
      userId: a.userId,
      revShare: a.revShare,
    });
  }
  return map;
}

/**
 * Calculate net revenue from gross revenue and revShare
 */
export function calculateNetRevenue(grossRevenue: number, revShare: number): number {
  return Math.round(grossRevenue * (revShare / 100) * 100) / 100;
}

/**
 * Save Sedo revenue data to database (upsert)
 * Updates if record exists, inserts if new
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN, not the logged-in user.
 * 
 * @param data - Array of Sedo revenue data
 * @param fallbackUserId - User ID to use if domain has no assignment (usually admin)
 * @param options - Optional settings
 * @param options.filterByAssignedDomains - If true, only saves data for domains assigned to specific users
 * @param options.saveToDomainOwner - If true, saves data to the user who owns the domain (default: true)
 * @param options.accountId - Network account ID for multi-account support
 */
export async function saveSedoRevenue(
  data: SedoRevenueData[],
  fallbackUserId: string,
  options: { filterByAssignedDomains?: boolean; saveToDomainOwner?: boolean; accountId?: string } = {}
): Promise<{ saved: number; updated: number; skipped: number; errors: string[] }> {
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Default: save to domain owner
  const saveToDomainOwner = options.saveToDomainOwner !== false;

  // OPTIMIZED: Get all domain assignments in ONE query (userId + revShare)
  // This eliminates N+1 queries - we now fetch everything upfront
  const domainAssignments = await getAllDomainAssignmentsMap("sedo");

  for (const item of data) {
    try {
      const domainValue = item.domain || null;
      const normalizedDomain = domainValue?.toLowerCase().trim();

      // Determine which user should own this data and get revShare
      let targetUserId = fallbackUserId;
      let revShare = DEFAULT_REV_SHARE;
      
      if (saveToDomainOwner && normalizedDomain) {
        const assignment = domainAssignments.get(normalizedDomain);
        if (assignment) {
          targetUserId = assignment.userId;
          revShare = assignment.revShare;
        } else if (options.filterByAssignedDomains) {
          // Domain not assigned to anyone - skip if filtering is enabled
          skipped++;
          continue;
        }
        // If domain not assigned but filtering disabled, use fallback user (admin)
      } else if (options.filterByAssignedDomains && !normalizedDomain) {
        // Skip aggregate data (no domain) when filtering
        skipped++;
        continue;
      }

      // Calculate net revenue (no DB call needed now!)
      const netRevenue = calculateNetRevenue(item.revenue, revShare);

      // Parse date - ensure it's a valid date
      const date = new Date(item.date);
      date.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

      // Data to save
      const recordData = {
        grossRevenue: item.revenue,
        netRevenue,
        revShare,
        impressions: item.impressions || item.uniques || 0,
        clicks: item.clicks || 0,
        ctr: item.ctr || null,
        rpm: item.rpm || null,
        status: "Estimated",
        accountId: options.accountId || null,
      };

      // Find existing record manually (check both for this user and if domain already exists for another user)
      const existing = await prisma.bidder_Sedo.findFirst({
        where: {
          date,
          domain: domainValue,
          c1: null,
          c2: null,
          c3: null,
          userId: targetUserId,
        },
      });

      if (existing) {
        // Update existing record
        await prisma.bidder_Sedo.update({
          where: { id: existing.id },
          data: recordData,
        });
        updated++;
      } else {
        // Check if this domain+date exists for a DIFFERENT user (shouldn't happen, but handle it)
        const existingOtherUser = await prisma.bidder_Sedo.findFirst({
          where: {
            date,
            domain: domainValue,
            c1: null,
            c2: null,
            c3: null,
          },
        });

        if (existingOtherUser && existingOtherUser.userId !== targetUserId) {
          // Update existing record to correct user
          await prisma.bidder_Sedo.update({
            where: { id: existingOtherUser.id },
            data: {
              userId: targetUserId,
              ...recordData,
            },
          });
          updated++;
        } else if (!existingOtherUser) {
          // Create new record
          await prisma.bidder_Sedo.create({
            data: {
              date,
              domain: domainValue,
              c1: null,
              c2: null,
              c3: null,
              currency: "EUR",
              userId: targetUserId,
              ...recordData,
            },
          });
          saved++;
        } else {
          updated++; // Same user, just update
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to save ${item.date} ${item.domain}: ${errorMsg}`);
      console.error(`[Revenue DB] Error saving ${item.date} ${item.domain}:`, error);
    }
  }

  console.log(`[Revenue DB] Sedo data saved: ${saved} new, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
  
  // Invalidate dashboard cache after sync
  cache.invalidatePrefix("dashboard:");
  cache.invalidatePrefix("sync-status:");
  
  return { saved, updated, skipped, errors };
}

/**
 * Get Sedo revenue data from database
 */
export async function getSedoRevenue(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    domain?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, domain, limit } = options;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (domain) {
    where.domain = domain;
  }

  const data = await prisma.bidder_Sedo.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });

  return data;
}

/**
 * Get aggregated revenue summary
 */
export async function getSedoRevenueSummary(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { startDate, endDate } = options;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  const result = await prisma.bidder_Sedo.aggregate({
    where,
    _sum: {
      grossRevenue: true,
      netRevenue: true,
      impressions: true,
      clicks: true,
    },
    _count: true,
  });

  return {
    totalGrossRevenue: result._sum.grossRevenue || 0,
    totalNetRevenue: result._sum.netRevenue || 0,
    totalImpressions: result._sum.impressions || 0,
    totalClicks: result._sum.clicks || 0,
    recordCount: result._count,
  };
}

/**
 * Create or update domain assignment (revShare settings)
 */
export async function setDomainAssignment(
  userId: string,
  domain: string,
  network: string = "sedo",
  revShare: number,
  notes?: string
) {
  // Use findFirst + create/update pattern
  const existing = await prisma.domain_Assignment.findFirst({
    where: {
      domain,
      network,
    },
  });

  if (existing) {
    return prisma.domain_Assignment.update({
      where: { id: existing.id },
      data: {
        userId, // Can reassign to different user
        revShare,
        notes,
        isActive: true,
      },
    });
  }

  return prisma.domain_Assignment.create({
    data: {
      userId,
      domain,
      network,
      revShare,
      notes,
      isActive: true,
    },
  });
}

/**
 * Get all domain assignments for a user
 */
export async function getDomainAssignments(userId: string) {
  return prisma.domain_Assignment.findMany({
    where: { userId, isActive: true },
    orderBy: [{ domain: "asc" }, { network: "asc" }],
  });
}

/**
 * Get list of domain names assigned to a user for a specific network
 * Returns null if user has no specific domain assignments (means they see nothing)
 * Returns empty array should also mean no domains assigned
 */
export async function getUserAssignedDomains(
  userId: string,
  network: string = "sedo"
): Promise<string[]> {
  const assignments = await prisma.domain_Assignment.findMany({
    where: {
      userId,
      network,
      isActive: true,
    },
    select: { domain: true },
  });

  return assignments
    .map((a) => a.domain)
    .filter((d): d is string => d !== null);
}

/**
 * Get the user ID who owns a specific domain
 * Returns null if domain is not assigned to anyone
 */
export async function getDomainOwner(
  domain: string,
  network: string = "sedo"
): Promise<string | null> {
  const assignment = await prisma.domain_Assignment.findFirst({
    where: {
      domain: domain.toLowerCase().trim(),
      network,
      isActive: true,
    },
    select: { userId: true },
  });

  return assignment?.userId ?? null;
}

/**
 * Get all domain assignments with their owners for a network
 * Returns a Map of domain -> userId
 */
export async function getAllDomainOwners(
  network: string = "sedo"
): Promise<Map<string, string>> {
  const assignments = await prisma.domain_Assignment.findMany({
    where: {
      network,
      isActive: true,
    },
    select: { domain: true, userId: true },
  });

  const map = new Map<string, string>();
  for (const a of assignments) {
    if (a.domain) {
      map.set(a.domain.toLowerCase().trim(), a.userId);
    }
  }
  return map;
}

/**
 * Sync domains from Sedo to Domain_Assignment table
 * Creates assignments with default revShare if they don't exist
 */
export async function syncDomainsToAssignment(
  userId: string,
  domains: Array<{ domain: string; revenue?: number; clicks?: number; impressions?: number }>,
  network: string = "sedo",
  defaultRevShare: number = 80
): Promise<{ created: number; existing: number; errors: string[] }> {
  let created = 0;
  let existing = 0;
  const errors: string[] = [];

  for (const item of domains) {
    if (!item.domain || item.domain.trim() === "") continue;

    try {
      const domain = item.domain.trim().toLowerCase();

      // Check if assignment already exists
      const existingAssignment = await prisma.domain_Assignment.findFirst({
        where: { userId, domain, network },
      });

      if (existingAssignment) {
        existing++;
      } else {
        // Create new assignment with default revShare
        await prisma.domain_Assignment.create({
          data: {
            userId,
            domain,
            network,
            revShare: defaultRevShare,
            isActive: true,
            notes: `Auto-created from ${network} sync`,
          },
        });
        created++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to sync domain ${item.domain}: ${errorMsg}`);
      console.error(`[Domain Sync] Error:`, error);
    }
  }

  console.log(`[Domain Sync] ${network}: ${created} created, ${existing} existing, ${errors.length} errors`);
  return { created, existing, errors };
}

/**
 * Sync Bidder_Sedo data to Overview_Report
 * If userId is provided, syncs only that user's data
 * If userId is null, syncs ALL users' data (admin sync)
 * 
 * Data in Bidder_Sedo already has correct userId from saveSedoRevenue
 */
export async function syncToOverviewReport(userId: string | null = null): Promise<{ synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];

  try {
    // Get Sedo data - either for one user or all users
    const sedoData = await prisma.bidder_Sedo.findMany({
      where: userId ? { userId } : undefined,
    });

    // Group by userId + date + domain for Overview
    const grouped = new Map<string, {
      userId: string;
      date: Date;
      domain: string | null;
      grossRevenue: number;
      netRevenue: number;
      impressions: number;
      clicks: number;
    }>();

    for (const record of sedoData) {
      const key = `${record.userId}_${record.date.toISOString().split('T')[0]}_${record.domain || 'all'}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.grossRevenue += record.grossRevenue;
        existing.netRevenue += record.netRevenue;
        existing.impressions += record.impressions;
        existing.clicks += record.clicks;
      } else {
        grouped.set(key, {
          userId: record.userId,
          date: record.date,
          domain: record.domain,
          grossRevenue: record.grossRevenue,
          netRevenue: record.netRevenue,
          impressions: record.impressions,
          clicks: record.clicks,
        });
      }
    }

    // Save to Overview_Report
    for (const [, data] of grouped) {
      try {
        const ctr = data.impressions > 0 
          ? Math.round((data.clicks / data.impressions) * 10000) / 100 
          : null;
        const rpm = data.impressions > 0 
          ? Math.round((data.grossRevenue / data.impressions) * 1000 * 100) / 100 
          : null;

        const recordData = {
          grossRevenue: data.grossRevenue,
          netRevenue: data.netRevenue,
          impressions: data.impressions,
          clicks: data.clicks,
          ctr,
          rpm,
        };

        // Find existing record
        const existing = await prisma.overview_Report.findFirst({
          where: {
            date: data.date,
            network: "sedo",
            domain: data.domain,
            userId: data.userId,
          },
        });

        if (existing) {
          await prisma.overview_Report.update({
            where: { id: existing.id },
            data: recordData,
          });
        } else {
          await prisma.overview_Report.create({
            data: {
              date: data.date,
              network: "sedo",
              domain: data.domain,
              currency: "EUR",
              userId: data.userId,
              ...recordData,
            },
          });
        }
        synced++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to sync overview for ${data.date}: ${errorMsg}`);
      }
    }

    console.log(`[Overview Sync] ${userId ? `User ${userId}` : 'All users'}: ${synced} records synced, ${errors.length} errors`);
  } catch (error) {
    console.error("[Overview Sync] Error:", error);
    errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  return { synced, errors };
}

/**
 * Get Overview Report data for a user
 */
export async function getOverviewReport(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    network?: string;
    domain?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, network, domain, limit } = options;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (network) where.network = network;
  if (domain) where.domain = domain;

  const data = await prisma.overview_Report.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
  });

  // Calculate summary
  const summary = {
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalImpressions: 0,
    totalClicks: 0,
    avgCtr: 0,
    avgRpm: 0,
  };

  for (const record of data) {
    summary.totalGrossRevenue += record.grossRevenue;
    summary.totalNetRevenue += record.netRevenue;
    summary.totalImpressions += record.impressions;
    summary.totalClicks += record.clicks;
  }

  if (summary.totalImpressions > 0) {
    summary.avgCtr = Math.round((summary.totalClicks / summary.totalImpressions) * 10000) / 100;
    summary.avgRpm = Math.round((summary.totalGrossRevenue / summary.totalImpressions) * 1000 * 100) / 100;
  }

  return { data, summary };
}

/**
 * Get dashboard summary data (aggregated by date, not network)
 * OPTIMIZED: Uses database aggregation + caching
 */
export async function getDashboardSummary(
  userId: string,
  period: "current" | "last" = "current"
) {
  return cache.get(
    CacheKeys.dashboardSummary(userId, period),
    async () => getDashboardSummaryImpl(userId, period),
    CacheTTL.MEDIUM // 5 minutes
  );
}

async function getDashboardSummaryImpl(
  userId: string,
  period: "current" | "last" = "current"
) {
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === "current") {
    // Current month: 1st of this month to today
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  } else {
    // Last month: 1st to last day of previous month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  }

  // OPTIMIZED: Get aggregated data in parallel
  const whereClause = {
    userId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [totalsAgg, byNetworkAgg, dailyData, topDomainsAgg] = await Promise.all([
    // Total aggregates (1 query)
    prisma.overview_Report.aggregate({
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    
    // Group by network (1 query)
    prisma.overview_Report.groupBy({
      by: ["network"],
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    
    // Daily data (1 query)
    prisma.overview_Report.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    }),
    
    // Top domains (1 query)
    prisma.overview_Report.groupBy({
      by: ["domain"],
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
      },
      orderBy: {
        _sum: {
          grossRevenue: "desc",
        },
      },
      take: 5,
    }),
  ]);

  // Aggregate daily data by date (combine all networks)
  const dailyMap = new Map<string, {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  }>();

  for (const record of dailyData) {
    const dateKey = record.date.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey);

    if (existing) {
      existing.grossRevenue += record.grossRevenue;
      existing.netRevenue += record.netRevenue;
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
    } else {
      dailyMap.set(dateKey, {
        date: dateKey,
        grossRevenue: record.grossRevenue,
        netRevenue: record.netRevenue,
        impressions: record.impressions,
        clicks: record.clicks,
      });
    }
  }

  const dailyDataFormatted = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format totals
  const totalGross = totalsAgg._sum.grossRevenue || 0;
  const totalImpressions = totalsAgg._sum.impressions || 0;
  const totalClicks = totalsAgg._sum.clicks || 0;

  const totals = {
    grossRevenue: Math.round(totalGross * 100) / 100,
    netRevenue: Math.round((totalsAgg._sum.netRevenue || 0) * 100) / 100,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: totalImpressions > 0 
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100 
      : 0,
    rpm: totalImpressions > 0 
      ? Math.round((totalGross / totalImpressions) * 1000 * 100) / 100 
      : 0,
  };

  // Format network breakdown
  const byNetwork = byNetworkAgg.map((n) => ({
    network: n.network || "unknown",
    grossRevenue: Math.round((n._sum.grossRevenue || 0) * 100) / 100,
    netRevenue: Math.round((n._sum.netRevenue || 0) * 100) / 100,
    impressions: n._sum.impressions || 0,
    clicks: n._sum.clicks || 0,
  }));

  // Format top domains
  const topDomains = topDomainsAgg.map((d) => ({
    domain: d.domain || "All Domains",
    grossRevenue: d._sum.grossRevenue || 0,
    netRevenue: d._sum.netRevenue || 0,
  }));

  return {
    period,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    totals,
    byNetwork,
    dailyData: dailyDataFormatted,
    topDomains,
  };
}

// Keep the old implementation for reference but mark as deprecated
/** @deprecated Use getDashboardSummary instead */
async function getDashboardSummaryLegacy(
  userId: string,
  period: "current" | "last" = "current"
) {
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === "current") {
    // Current month: 1st of this month to today
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  } else {
    // Last month: 1st to last day of previous month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  }

  // Get all data for the period
  const data = await prisma.overview_Report.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  // Aggregate by date (combine all networks)
  const dailyMap = new Map<string, {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  }>();

  for (const record of data) {
    const dateKey = record.date.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey);

    if (existing) {
      existing.grossRevenue += record.grossRevenue;
      existing.netRevenue += record.netRevenue;
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
    } else {
      dailyMap.set(dateKey, {
        date: dateKey,
        grossRevenue: record.grossRevenue,
        netRevenue: record.netRevenue,
        impressions: record.impressions,
        clicks: record.clicks,
      });
    }
  }

  const dailyData = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate totals
  const totals = {
    grossRevenue: 0,
    netRevenue: 0,
    impressions: 0,
    clicks: 0,
  };

  for (const day of dailyData) {
    totals.grossRevenue += day.grossRevenue;
    totals.netRevenue += day.netRevenue;
    totals.impressions += day.impressions;
    totals.clicks += day.clicks;
  }

  // Calculate totals by network
  const networkMap = new Map<string, {
    network: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  }>();

  for (const record of data) {
    const network = record.network || "unknown";
    const existing = networkMap.get(network);

    if (existing) {
      existing.grossRevenue += record.grossRevenue;
      existing.netRevenue += record.netRevenue;
      existing.impressions += record.impressions;
      existing.clicks += record.clicks;
    } else {
      networkMap.set(network, {
        network,
        grossRevenue: record.grossRevenue,
        netRevenue: record.netRevenue,
        impressions: record.impressions,
        clicks: record.clicks,
      });
    }
  }

  const byNetwork = Array.from(networkMap.values()).map((n) => ({
    network: n.network,
    grossRevenue: Math.round(n.grossRevenue * 100) / 100,
    netRevenue: Math.round(n.netRevenue * 100) / 100,
    impressions: n.impressions,
    clicks: n.clicks,
  }));

  // Get top domains
  const domainMap = new Map<string, {
    domain: string;
    grossRevenue: number;
    netRevenue: number;
  }>();

  for (const record of data) {
    const domain = record.domain || "All Domains";
    const existing = domainMap.get(domain);

    if (existing) {
      existing.grossRevenue += record.grossRevenue;
      existing.netRevenue += record.netRevenue;
    } else {
      domainMap.set(domain, {
        domain,
        grossRevenue: record.grossRevenue,
        netRevenue: record.netRevenue,
      });
    }
  }

  const topDomains = Array.from(domainMap.values())
    .sort((a, b) => b.grossRevenue - a.grossRevenue)
    .slice(0, 5);

  return {
    period,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    totals: {
      grossRevenue: Math.round(totals.grossRevenue * 100) / 100,
      netRevenue: Math.round(totals.netRevenue * 100) / 100,
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 
        ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 
        : 0,
      rpm: totals.impressions > 0 
        ? Math.round((totals.grossRevenue / totals.impressions) * 1000 * 100) / 100 
        : 0,
    },
    byNetwork, // Network breakdown
    dailyData,
    topDomains,
  };
}

/**
 * Get revenue comparison between current and previous period
 */
export async function getRevenueComparison(
  userId: string
): Promise<{
  current: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  };
  previous: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  };
  change: {
    grossRevenue: { value: number; percent: number };
    netRevenue: { value: number; percent: number };
    impressions: { value: number; percent: number };
    clicks: { value: number; percent: number };
  };
}> {
  const now = new Date();

  // Current month
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = now;

  // Last month (same day range for fair comparison)
  const dayOfMonth = now.getDate();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth);

  // Fetch both periods
  const [currentData, previousData] = await Promise.all([
    prisma.overview_Report.aggregate({
      where: {
        userId,
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    prisma.overview_Report.aggregate({
      where: {
        userId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
  ]);

  const current = {
    grossRevenue: currentData._sum.grossRevenue || 0,
    netRevenue: currentData._sum.netRevenue || 0,
    impressions: currentData._sum.impressions || 0,
    clicks: currentData._sum.clicks || 0,
  };

  const previous = {
    grossRevenue: previousData._sum.grossRevenue || 0,
    netRevenue: previousData._sum.netRevenue || 0,
    impressions: previousData._sum.impressions || 0,
    clicks: previousData._sum.clicks || 0,
  };

  // Calculate changes
  const calcChange = (curr: number, prev: number) => ({
    value: Math.round((curr - prev) * 100) / 100,
    percent: prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : curr > 0 ? 100 : 0,
  });

  const change = {
    grossRevenue: calcChange(current.grossRevenue, previous.grossRevenue),
    netRevenue: calcChange(current.netRevenue, previous.netRevenue),
    impressions: calcChange(current.impressions, previous.impressions),
    clicks: calcChange(current.clicks, previous.clicks),
  };

  return { current, previous, change };
}

// ============================================
// YANDEX REVENUE FUNCTIONS
// ============================================

/**
 * Save Yandex revenue data to database (upsert)
 * 
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN, not the logged-in user.
 */
export async function saveYandexRevenue(
  data: YandexRevenueData[],
  fallbackUserId: string,
  options: { saveToDomainOwner?: boolean; filterByAssignedDomains?: boolean; accountId?: string } = {}
): Promise<{ saved: number; updated: number; skipped: number; errors: string[] }> {
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const saveToDomainOwner = options.saveToDomainOwner !== false;
  
  // OPTIMIZED: Get all domain assignments in ONE query (userId + revShare)
  const domainAssignments = await getAllDomainAssignmentsMap("yandex");

  for (const item of data) {
    try {
      const domainValue = item.domain || null;
      const normalizedDomain = domainValue?.toLowerCase().trim();

      // Determine target user and revShare
      let targetUserId = fallbackUserId;
      let revShare = DEFAULT_REV_SHARE;
      
      if (saveToDomainOwner && normalizedDomain) {
        const assignment = domainAssignments.get(normalizedDomain);
        if (assignment) {
          targetUserId = assignment.userId;
          revShare = assignment.revShare;
        } else if (options.filterByAssignedDomains) {
          skipped++;
          continue;
        }
      } else if (options.filterByAssignedDomains && !normalizedDomain) {
        skipped++;
        continue;
      }

      // Calculate net revenue (no DB call needed now!)
      const netRevenue = calculateNetRevenue(item.revenue, revShare);

      // Parse date
      const date = new Date(item.date);
      date.setUTCHours(0, 0, 0, 0);

      const recordData = {
        grossRevenue: item.revenue,
        netRevenue,
        revShare,
        impressions: item.impressions || 0,
        clicks: item.clicks || 0,
        ctr: item.ctr || null,
        rpm: item.rpm || null,
        tagName: item.tagName || null,
        status: "Estimated",
        accountId: options.accountId || null,
      };

      // Find existing record
      const existing = await prisma.bidder_Yandex.findFirst({
        where: {
          date,
          domain: domainValue,
          tagId: item.tagId || null,
          userId: targetUserId,
        },
      });

      if (existing) {
        await prisma.bidder_Yandex.update({
          where: { id: existing.id },
          data: recordData,
        });
        updated++;
      } else {
        // Check if exists for different user
        const existingOtherUser = await prisma.bidder_Yandex.findFirst({
          where: {
            date,
            domain: domainValue,
            tagId: item.tagId || null,
          },
        });

        if (existingOtherUser && existingOtherUser.userId !== targetUserId) {
          await prisma.bidder_Yandex.update({
            where: { id: existingOtherUser.id },
            data: { userId: targetUserId, ...recordData },
          });
          updated++;
        } else if (!existingOtherUser) {
          await prisma.bidder_Yandex.create({
            data: {
              date,
              domain: domainValue,
              tagId: item.tagId || null,
              currency: "USD",
              userId: targetUserId,
              ...recordData,
            },
          });
          saved++;
        } else {
          updated++;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to save ${item.date} ${item.domain}: ${errorMsg}`);
      console.error(`[Revenue DB] Yandex error:`, error);
    }
  }

  console.log(`[Revenue DB] Yandex data: ${saved} new, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
  
  // Invalidate dashboard cache after sync
  cache.invalidatePrefix("dashboard:");
  cache.invalidatePrefix("sync-status:");
  
  return { saved, updated, skipped, errors };
}

/**
 * Get Yandex revenue data from database
 */
export async function getYandexRevenue(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    domain?: string;
    tagId?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, domain, tagId, limit } = options;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (domain) where.domain = domain;
  if (tagId) where.tagId = tagId;

  const data = await prisma.bidder_Yandex.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });

  return data;
}

/**
 * Get aggregated Yandex revenue summary
 */
export async function getYandexRevenueSummary(
  userId: string,
  options: { startDate?: Date; endDate?: Date } = {}
) {
  const { startDate, endDate } = options;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  const result = await prisma.bidder_Yandex.aggregate({
    where,
    _sum: {
      grossRevenue: true,
      netRevenue: true,
      impressions: true,
      clicks: true,
    },
    _count: true,
  });

  return {
    totalGrossRevenue: result._sum.grossRevenue || 0,
    totalNetRevenue: result._sum.netRevenue || 0,
    totalImpressions: result._sum.impressions || 0,
    totalClicks: result._sum.clicks || 0,
    recordCount: result._count,
  };
}

/**
 * Sync Yandex data to Overview Report
 */
export async function syncYandexToOverviewReport(userId: string | null = null): Promise<{ synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];

  try {
    const yandexData = await prisma.bidder_Yandex.findMany({
      where: userId ? { userId } : undefined,
    });

    // Group by userId + date + domain
    const grouped = new Map<string, {
      userId: string;
      date: Date;
      domain: string | null;
      grossRevenue: number;
      netRevenue: number;
      impressions: number;
      clicks: number;
    }>();

    for (const record of yandexData) {
      const key = `${record.userId}_${record.date.toISOString().split('T')[0]}_${record.domain || 'all'}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.grossRevenue += record.grossRevenue;
        existing.netRevenue += record.netRevenue;
        existing.impressions += record.impressions;
        existing.clicks += record.clicks;
      } else {
        grouped.set(key, {
          userId: record.userId,
          date: record.date,
          domain: record.domain,
          grossRevenue: record.grossRevenue,
          netRevenue: record.netRevenue,
          impressions: record.impressions,
          clicks: record.clicks,
        });
      }
    }

    // Save to Overview_Report
    for (const [, data] of grouped) {
      try {
        const ctr = data.impressions > 0 
          ? Math.round((data.clicks / data.impressions) * 10000) / 100 
          : null;
        const rpm = data.impressions > 0 
          ? Math.round((data.grossRevenue / data.impressions) * 1000 * 100) / 100 
          : null;

        const recordData = {
          grossRevenue: data.grossRevenue,
          netRevenue: data.netRevenue,
          impressions: data.impressions,
          clicks: data.clicks,
          ctr,
          rpm,
        };

        const existing = await prisma.overview_Report.findFirst({
          where: {
            date: data.date,
            network: "yandex",
            domain: data.domain,
            userId: data.userId,
          },
        });

        if (existing) {
          await prisma.overview_Report.update({
            where: { id: existing.id },
            data: recordData,
          });
        } else {
          await prisma.overview_Report.create({
            data: {
              date: data.date,
              network: "yandex",
              domain: data.domain,
              currency: "USD",
              userId: data.userId,
              ...recordData,
            },
          });
        }
        synced++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to sync overview for ${data.date}: ${errorMsg}`);
      }
    }

    console.log(`[Yandex Overview Sync] ${userId ? `User ${userId}` : 'All users'}: ${synced} records, ${errors.length} errors`);
  } catch (error) {
    console.error("[Yandex Overview Sync] Error:", error);
    errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  return { synced, errors };
}

// ============================================
// SYNC STATUS FUNCTIONS
// ============================================

/**
 * Get the last sync time for each network
 */
export async function getLastSyncTime(userId?: string): Promise<{
  sedo: Date | null;
  yandex: Date | null;
  overall: Date | null;
}> {
  const where = userId ? { userId } : {};

  // Get most recent updatedAt for each network
  const [sedoRecord, yandexRecord] = await Promise.all([
    prisma.bidder_Sedo.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.bidder_Yandex.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const sedoTime = sedoRecord?.updatedAt || null;
  const yandexTime = yandexRecord?.updatedAt || null;

  // Get the most recent overall
  let overall: Date | null = null;
  if (sedoTime && yandexTime) {
    overall = sedoTime > yandexTime ? sedoTime : yandexTime;
  } else {
    overall = sedoTime || yandexTime;
  }

  return {
    sedo: sedoTime,
    yandex: yandexTime,
    overall,
  };
}

/**
 * Get sync status summary (CACHED for 30 seconds)
 */
export async function getSyncStatus(userId?: string): Promise<{
  lastSync: {
    sedo: Date | null;
    yandex: Date | null;
    overall: Date | null;
  };
  recordCounts: {
    sedo: number;
    yandex: number;
    overview: number;
  };
}> {
  return cache.get(
    CacheKeys.syncStatus(userId),
    async () => {
      const where = userId ? { userId } : {};

      const [lastSync, sedoCount, yandexCount, overviewCount] = await Promise.all([
        getLastSyncTime(userId),
        prisma.bidder_Sedo.count({ where }),
        prisma.bidder_Yandex.count({ where }),
        prisma.overview_Report.count({ where }),
      ]);

      return {
        lastSync,
        recordCounts: {
          sedo: sedoCount,
          yandex: yandexCount,
          overview: overviewCount,
        },
      };
    },
    CacheTTL.SHORT // 30 seconds
  );
}

