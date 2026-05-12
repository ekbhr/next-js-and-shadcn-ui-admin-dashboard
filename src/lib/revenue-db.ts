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
import { maskAdvertivDomain } from "@/lib/domain-alias";
import type { YandexRevenueData } from "@/lib/yandex";
import type { AdvertivRevenueData } from "@/lib/advertiv";
import type { YhsRevenueData } from "@/lib/yhs";

// Default revShare if no assignment found
const DEFAULT_REV_SHARE = 80;

/** One row shape for overview, API, and admin views (Yandex via Overview_Report; Yahoo/YHS via bidder tables). */
export type UnifiedRevenueReportRow = {
  id: string;
  date: Date;
  network: string;
  domain: string | null;
  /** Yahoo (Advertiv) only — used for YH_Feed_<sub>_<campaign> labels */
  campaignId?: string | null;
  grossRevenue: number;
  netRevenue: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  rpm: number | null;
  userId: string;
};

function mapAdvertivToUnified(r: {
  id: string;
  date: Date;
  domain: string | null;
  subId: string | null;
  campaignId: string | null;
  grossRevenue: number;
  netRevenue: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  rpm: number | null;
  userId: string;
}): UnifiedRevenueReportRow {
  return {
    id: `advertiv:${r.id}`,
    date: r.date,
    network: "advertiv",
    domain: r.domain ?? r.subId ?? null,
    campaignId: r.campaignId ?? null,
    grossRevenue: r.grossRevenue,
    netRevenue: r.netRevenue,
    currency: r.currency,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr ?? null,
    rpm: r.rpm ?? null,
    userId: r.userId,
  };
}

function mapYhsToUnified(r: {
  id: string;
  date: Date;
  domain: string | null;
  grossRevenue: number;
  netRevenue: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  rpm: number | null;
  userId: string;
}): UnifiedRevenueReportRow {
  return {
    id: `yhs:${r.id}`,
    date: r.date,
    network: "yhs",
    domain: r.domain,
    campaignId: null,
    grossRevenue: r.grossRevenue,
    netRevenue: r.netRevenue,
    currency: r.currency,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr ?? null,
    rpm: r.rpm ?? null,
    userId: r.userId,
  };
}

export type LoadUnifiedRevenueParams = {
  userId: string;
  scope: "user" | "all";
  startDate?: Date;
  endDate?: Date;
  network?: string;
  domain?: string;
};

/**
 * Load revenue rows: Yandex from Overview_Report (network=yandex only); Yahoo/YHS from bidder tables (full detail).
 */
export async function loadUnifiedRevenueReportRows(
  params: LoadUnifiedRevenueParams,
): Promise<UnifiedRevenueReportRow[]> {
  const { userId, scope, startDate, endDate, network, domain } = params;
  const userFilter = scope === "all" ? {} : { userId };

  const dateWhere: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateWhere.date = {};
    if (startDate) (dateWhere.date as Record<string, Date>).gte = startDate;
    if (endDate) (dateWhere.date as Record<string, Date>).lte = endDate;
  }

  const rows: UnifiedRevenueReportRow[] = [];
  const wantYandex = !network || network === "yandex";
  const wantAdvertiv = !network || network === "advertiv";
  const wantYhs = !network || network === "yhs";

  if (wantYandex) {
    const yandexData = await prisma.overview_Report.findMany({
      where: {
        ...userFilter,
        ...dateWhere,
        network: "yandex",
        ...(domain ? { domain } : {}),
      },
      orderBy: { date: "desc" },
    });
    for (const r of yandexData) {
      rows.push({
        id: r.id,
        date: r.date,
        network: r.network,
        domain: r.domain,
        grossRevenue: r.grossRevenue,
        netRevenue: r.netRevenue,
        currency: r.currency,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: r.ctr ?? null,
        rpm: r.rpm ?? null,
        userId: r.userId,
      });
    }
  }

  if (wantAdvertiv) {
    const d = domain?.trim();
    const dNorm = d?.toLowerCase();
    const advWhere: Record<string, unknown> = {
      ...userFilter,
      ...dateWhere,
      ...(d
        ? {
            OR: [
              { domain: d },
              ...(dNorm && dNorm !== d ? [{ domain: dNorm }] : []),
              { subId: d },
              ...(dNorm && dNorm !== d ? [{ subId: dNorm }] : []),
            ],
          }
        : {}),
    };
    const advData = await prisma.bidder_Advertiv.findMany({
      where: advWhere,
      orderBy: { date: "desc" },
    });
    for (const r of advData) {
      rows.push(mapAdvertivToUnified(r));
    }
  }

  if (wantYhs) {
    const dNorm = domain?.toLowerCase().trim();
    const yhsWhere: Record<string, unknown> = {
      ...userFilter,
      ...dateWhere,
      ...(dNorm ? { domain: dNorm } : {}),
    };
    const yhsData = await prisma.bidder_YHS.findMany({
      where: yhsWhere,
      orderBy: { date: "desc" },
    });
    for (const r of yhsData) {
      rows.push(mapYhsToUnified(r));
    }
  }

  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Row counts for pagination (same filters as loadUnifiedRevenueReportRows). */
export async function countUnifiedRevenueReportRows(
  params: LoadUnifiedRevenueParams,
): Promise<number> {
  const { userId, scope, startDate, endDate, network, domain } = params;
  const userFilter = scope === "all" ? {} : { userId };

  const dateWhere: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateWhere.date = {};
    if (startDate) (dateWhere.date as Record<string, Date>).gte = startDate;
    if (endDate) (dateWhere.date as Record<string, Date>).lte = endDate;
  }

  const wantYandex = !network || network === "yandex";
  const wantAdvertiv = !network || network === "advertiv";
  const wantYhs = !network || network === "yhs";

  let total = 0;

  if (wantYandex) {
    total += await prisma.overview_Report.count({
      where: {
        ...userFilter,
        ...dateWhere,
        network: "yandex",
        ...(domain ? { domain } : {}),
      },
    });
  }

  if (wantAdvertiv) {
    const d = domain?.trim();
    const dNorm = d?.toLowerCase();
    const advWhere: Record<string, unknown> = {
      ...userFilter,
      ...dateWhere,
      ...(d
        ? {
            OR: [
              { domain: d },
              ...(dNorm && dNorm !== d ? [{ domain: dNorm }] : []),
              { subId: d },
              ...(dNorm && dNorm !== d ? [{ subId: dNorm }] : []),
            ],
          }
        : {}),
    };
    total += await prisma.bidder_Advertiv.count({ where: advWhere });
  }

  if (wantYhs) {
    const dNorm = domain?.toLowerCase().trim();
    const yhsWhere: Record<string, unknown> = {
      ...userFilter,
      ...dateWhere,
      ...(dNorm ? { domain: dNorm } : {}),
    };
    total += await prisma.bidder_YHS.count({ where: yhsWhere });
  }

  return total;
}

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
 * Create or update domain assignment (revShare settings)
 */
export async function setDomainAssignment(
  userId: string,
  domain: string,
  network: string = "yandex",
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
  network: string = "yandex"
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
  network: string = "yandex"
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
  network: string = "yandex"
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
 * Sync domains from a network into Domain_Assignment
 * Creates assignments with default revShare if they don't exist
 */
export async function syncDomainsToAssignment(
  userId: string,
  domains: Array<{ domain: string; revenue?: number; clicks?: number; impressions?: number }>,
  network: string = "yandex",
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
    /** Admin: aggregate all publishers (omit userId filter). */
    scope?: "user" | "all";
  } = {}
) {
  const { startDate, endDate, network, domain, limit, scope = "user" } = options;

  let data = await loadUnifiedRevenueReportRows({
    userId,
    scope,
    startDate,
    endDate,
    network,
    domain,
  });

  if (limit !== undefined && limit > 0) {
    data = data.slice(0, limit);
  }

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
  period: "current" | "last" = "current",
  scope: "user" | "all" = "user"
) {
  const cacheUserId = scope === "all" ? "__all__" : userId;
  return cache.get(
    CacheKeys.dashboardSummary(cacheUserId, period),
    async () => getDashboardSummaryImpl(userId, period, scope),
    CacheTTL.MEDIUM // 5 minutes
  );
}

async function getDashboardSummaryImpl(
  userId: string,
  period: "current" | "last" = "current",
  scope: "user" | "all" = "user"
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
  const whereClause =
    scope === "all"
      ? {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        };

  const yandexWhere = { ...whereClause, network: "yandex" as const };

  const [
    yandexTotals,
    advertivTotals,
    yhsTotals,
    yandexDaily,
    advertivDaily,
    yhsDaily,
    yandexTopDomains,
    advertivTopDomains,
    yhsTopDomains,
  ] = await Promise.all([
    prisma.overview_Report.aggregate({
      where: yandexWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    prisma.bidder_Advertiv.aggregate({
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    prisma.bidder_YHS.aggregate({
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
    }),
    prisma.overview_Report.groupBy({
      by: ["date"],
      where: yandexWhere,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.bidder_Advertiv.groupBy({
      by: ["date"],
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.bidder_YHS.groupBy({
      by: ["date"],
      where: whereClause,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.overview_Report.groupBy({
      by: ["network", "domain"],
      where: yandexWhere,
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
    prisma.bidder_Advertiv.groupBy({
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
    prisma.bidder_YHS.groupBy({
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

  const dailyMap = new Map<string, {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
  }>();

  const mergeDaily = (
    rows: Array<{
      date: Date;
      _sum: {
        grossRevenue: number | null;
        netRevenue: number | null;
        impressions: number | null;
        clicks: number | null;
      };
    }>,
  ) => {
    for (const record of rows) {
      const dateKey = record.date.toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey);
      const g = record._sum.grossRevenue || 0;
      const n = record._sum.netRevenue || 0;
      const i = record._sum.impressions || 0;
      const c = record._sum.clicks || 0;
      if (existing) {
        existing.grossRevenue += g;
        existing.netRevenue += n;
        existing.impressions += i;
        existing.clicks += c;
      } else {
        dailyMap.set(dateKey, {
          date: dateKey,
          grossRevenue: g,
          netRevenue: n,
          impressions: i,
          clicks: c,
        });
      }
    }
  };

  mergeDaily(yandexDaily);
  mergeDaily(advertivDaily);
  mergeDaily(yhsDaily);

  const dailyDataFormatted = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const totalGross =
    (yandexTotals._sum.grossRevenue || 0) +
    (advertivTotals._sum.grossRevenue || 0) +
    (yhsTotals._sum.grossRevenue || 0);
  const totalNet =
    (yandexTotals._sum.netRevenue || 0) +
    (advertivTotals._sum.netRevenue || 0) +
    (yhsTotals._sum.netRevenue || 0);
  const totalImpressions =
    (yandexTotals._sum.impressions || 0) +
    (advertivTotals._sum.impressions || 0) +
    (yhsTotals._sum.impressions || 0);
  const totalClicks =
    (yandexTotals._sum.clicks || 0) +
    (advertivTotals._sum.clicks || 0) +
    (yhsTotals._sum.clicks || 0);

  const totals = {
    grossRevenue: Math.round(totalGross * 100) / 100,
    netRevenue: Math.round(totalNet * 100) / 100,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0,
    rpm: totalImpressions > 0
      ? Math.round((totalGross / totalImpressions) * 1000 * 100) / 100
      : 0,
  };

  const byNetwork = [
    {
      network: "yandex",
      grossRevenue: Math.round((yandexTotals._sum.grossRevenue || 0) * 100) / 100,
      netRevenue: Math.round((yandexTotals._sum.netRevenue || 0) * 100) / 100,
      impressions: yandexTotals._sum.impressions || 0,
      clicks: yandexTotals._sum.clicks || 0,
    },
    {
      network: "advertiv",
      grossRevenue: Math.round((advertivTotals._sum.grossRevenue || 0) * 100) / 100,
      netRevenue: Math.round((advertivTotals._sum.netRevenue || 0) * 100) / 100,
      impressions: advertivTotals._sum.impressions || 0,
      clicks: advertivTotals._sum.clicks || 0,
    },
    {
      network: "yhs",
      grossRevenue: Math.round((yhsTotals._sum.grossRevenue || 0) * 100) / 100,
      netRevenue: Math.round((yhsTotals._sum.netRevenue || 0) * 100) / 100,
      impressions: yhsTotals._sum.impressions || 0,
      clicks: yhsTotals._sum.clicks || 0,
    },
  ];

  type TopAgg = {
    network: string;
    domain: string | null;
    campaignId?: string | null;
    gross: number;
    net: number;
  };

  const topCombined: TopAgg[] = [
    ...yandexTopDomains.map((d) => ({
      network: d.network || "yandex",
      domain: d.domain,
      gross: d._sum.grossRevenue || 0,
      net: d._sum.netRevenue || 0,
    })),
    ...advertivTopDomains.map((d) => ({
      network: "advertiv",
      domain: d.domain,
      campaignId: null as string | null,
      gross: d._sum.grossRevenue || 0,
      net: d._sum.netRevenue || 0,
    })),
    ...yhsTopDomains.map((d) => ({
      network: "yhs",
      domain: d.domain,
      gross: d._sum.grossRevenue || 0,
      net: d._sum.netRevenue || 0,
    })),
  ];

  topCombined.sort((a, b) => b.gross - a.gross);
  const topDomainsAgg = topCombined.slice(0, 5);

  const topDomains = topDomainsAgg.map((d) => ({
    domain:
      maskAdvertivDomain(d.network, d.domain, undefined, { campaignId: d.campaignId }) ||
      "All Domains",
    grossRevenue: d.gross,
    netRevenue: d.net,
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
  userId: string,
  scope: "user" | "all" = "user"
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

  const userFilter = scope === "all" ? {} : { userId };

  const sumTriple = (
    ya: { _sum: { grossRevenue: number | null; netRevenue: number | null; impressions: number | null; clicks: number | null } },
    adv: typeof ya,
    yhs: typeof ya,
  ) => ({
    grossRevenue:
      (ya._sum.grossRevenue || 0) + (adv._sum.grossRevenue || 0) + (yhs._sum.grossRevenue || 0),
    netRevenue:
      (ya._sum.netRevenue || 0) + (adv._sum.netRevenue || 0) + (yhs._sum.netRevenue || 0),
    impressions:
      (ya._sum.impressions || 0) + (adv._sum.impressions || 0) + (yhs._sum.impressions || 0),
    clicks: (ya._sum.clicks || 0) + (adv._sum.clicks || 0) + (yhs._sum.clicks || 0),
  });

  const [
    curYa,
    curAdv,
    curYhs,
    prevYa,
    prevAdv,
    prevYhs,
  ] = await Promise.all([
    prisma.overview_Report.aggregate({
      where: {
        ...userFilter,
        network: "yandex",
        date: { gte: currentStart, lte: currentEnd },
      },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
    prisma.bidder_Advertiv.aggregate({
      where: { ...userFilter, date: { gte: currentStart, lte: currentEnd } },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
    prisma.bidder_YHS.aggregate({
      where: { ...userFilter, date: { gte: currentStart, lte: currentEnd } },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
    prisma.overview_Report.aggregate({
      where: {
        ...userFilter,
        network: "yandex",
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
    prisma.bidder_Advertiv.aggregate({
      where: { ...userFilter, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
    prisma.bidder_YHS.aggregate({
      where: { ...userFilter, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { grossRevenue: true, netRevenue: true, impressions: true, clicks: true },
    }),
  ]);

  const current = sumTriple(curYa, curAdv, curYhs);
  const previous = sumTriple(prevYa, prevAdv, prevYhs);

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
// ADVERTIV (YAHOO) REVENUE FUNCTIONS
// ============================================

/**
 * Save Advertiv revenue data to database (upsert)
 *
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN (subId), not the logged-in user.
 */
export async function saveAdvertivRevenue(
  data: AdvertivRevenueData[],
  fallbackUserId: string,
  options: { saveToDomainOwner?: boolean; filterByAssignedDomains?: boolean; accountId?: string } = {}
): Promise<{ saved: number; updated: number; skipped: number; errors: string[] }> {
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const saveToDomainOwner = options.saveToDomainOwner !== false;
  const domainAssignments = await getAllDomainAssignmentsMap("advertiv");

  for (const item of data) {
    try {
      const domainValue = item.domain || item.subId || null;
      const normalizedDomain = domainValue?.toLowerCase().trim();

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

      const netRevenue = calculateNetRevenue(item.revenue, revShare);
      const date = new Date(item.date);
      date.setUTCHours(0, 0, 0, 0);

      const subId = item.subId || domainValue;
      const campaignId = item.campaignId || null;
      const countryCode = item.countryCode || null;

      const recordData = {
        domain: domainValue,
        pubId: item.pubId || null,
        subId: subId || null,
        campaignId,
        campaignName: item.campaignName || null,
        countryName: item.countryName || null,
        countryCode,
        totalSearches: item.totalSearches || 0,
        monetizedSearches: item.monetizedSearches || 0,
        monetizedCtr: item.monetizedCtr || null,
        epc: item.epc || null,
        grossRevenue: item.revenue,
        netRevenue,
        revShare,
        impressions: item.impressions || item.totalSearches || 0,
        clicks: item.clicks || 0,
        ctr: item.ctr || null,
        rpm: item.rpm || null,
        status: "Estimated",
        accountId: options.accountId || null,
      };

      const existing = await prisma.bidder_Advertiv.findFirst({
        where: {
          date,
          subId: subId || null,
          campaignId,
          countryCode,
          userId: targetUserId,
        },
      });

      if (existing) {
        await prisma.bidder_Advertiv.update({
          where: { id: existing.id },
          data: recordData,
        });
        updated++;
      } else {
        const existingOtherUser = await prisma.bidder_Advertiv.findFirst({
          where: {
            date,
            subId: subId || null,
            campaignId,
            countryCode,
          },
        });

        if (existingOtherUser && existingOtherUser.userId !== targetUserId) {
          await prisma.bidder_Advertiv.update({
            where: { id: existingOtherUser.id },
            data: { userId: targetUserId, ...recordData },
          });
          updated++;
        } else if (!existingOtherUser) {
          await prisma.bidder_Advertiv.create({
            data: {
              date,
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
      errors.push(`Failed to save ${item.date} ${item.subId || item.domain}: ${errorMsg}`);
      console.error("[Revenue DB] Advertiv error:", error);
    }
  }

  cache.invalidatePrefix("dashboard:");
  cache.invalidatePrefix("sync-status:");

  return { saved, updated, skipped, errors };
}

export async function getAdvertivRevenue(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    domain?: string;
    campaignId?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, domain, campaignId, limit } = options;
  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (domain) where.domain = domain;
  if (campaignId) where.campaignId = campaignId;

  return prisma.bidder_Advertiv.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function getAdvertivRevenueSummary(
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

  const result = await prisma.bidder_Advertiv.aggregate({
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

// ============================================
// SYNC STATUS FUNCTIONS
// ============================================

function isMissingDbObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const prismaCode = "code" in error ? String((error as { code?: string }).code) : "";
  if (prismaCode === "P2021" || prismaCode === "P2022") return true;
  const message = "message" in error ? String((error as { message?: string }).message) : "";
  return message.includes("Bidder_YHS") || message.includes("lastYhsSync");
}

/**
 * Get the last sync time for each network
 */
export async function getLastSyncTime(userId?: string): Promise<{
  yandex: Date | null;
  advertiv: Date | null;
  yhs: Date | null;
  overall: Date | null;
}> {
  const where = userId ? { userId } : {};

  // Get most recent updatedAt for each network
  const [yandexRecord, advertivRecord, yhsRecord] = await Promise.all([
    prisma.bidder_Yandex.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.bidder_Advertiv.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.bidder_YHS
      .findFirst({
        where,
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      })
      .catch((error) => {
        if (isMissingDbObjectError(error)) return null;
        throw error;
      }),
  ]);

  const yandexTime = yandexRecord?.updatedAt || null;
  const advertivTime = advertivRecord?.updatedAt || null;
  const yhsTime = yhsRecord?.updatedAt || null;
  const overall = [yandexTime, advertivTime, yhsTime]
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  return {
    yandex: yandexTime,
    advertiv: advertivTime,
    yhs: yhsTime,
    overall,
  };
}

/**
 * Get sync status summary (CACHED for 30 seconds)
 */
export async function getSyncStatus(userId?: string): Promise<{
  lastSync: {
    yandex: Date | null;
    advertiv: Date | null;
    yhs: Date | null;
    overall: Date | null;
  };
  recordCounts: {
    yandex: number;
    advertiv: number;
    yhs: number;
    overview: number;
  };
}> {
  return cache.get(
    CacheKeys.syncStatus(userId),
    async () => {
      const where = userId ? { userId } : {};

      const [lastSync, yandexCount, advertivCount, yhsCount, overviewCount] = await Promise.all([
        getLastSyncTime(userId),
        prisma.bidder_Yandex.count({ where }),
        prisma.bidder_Advertiv.count({ where }),
        prisma.bidder_YHS.count({ where }).catch((error) => {
          if (isMissingDbObjectError(error)) return 0;
          throw error;
        }),
        prisma.overview_Report.count({ where: { ...where, network: "yandex" } }),
      ]);

      return {
        lastSync,
        recordCounts: {
          yandex: yandexCount,
          advertiv: advertivCount,
          yhs: yhsCount,
          overview: overviewCount,
        },
      };
    },
    CacheTTL.SHORT // 30 seconds
  );
}

// ============================================
// YHS (Searchfor.live) REVENUE FUNCTIONS
// ============================================

/**
 * Save YHS revenue data to database (upsert).
 *
 * IMPORTANT: Data is saved to the USER WHO OWNS THE DOMAIN (linkid) based on Domain_Assignment.
 */
export async function saveYhsRevenue(
  data: YhsRevenueData[],
  fallbackUserId: string,
  options: { saveToDomainOwner?: boolean; filterByAssignedDomains?: boolean; accountId?: string } = {},
): Promise<{ saved: number; updated: number; skipped: number; errors: string[] }> {
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const saveToDomainOwner = options.saveToDomainOwner !== false;
  const domainAssignments = await getAllDomainAssignmentsMap("yhs");

  for (const item of data) {
    try {
      const domainValue = item.domain || null;
      const normalizedDomain = domainValue?.toLowerCase().trim() || null;

      if (!normalizedDomain) {
        skipped++;
        continue;
      }

      let targetUserId = fallbackUserId;
      let revShare = DEFAULT_REV_SHARE;

      if (saveToDomainOwner) {
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

      const netRevenue = calculateNetRevenue(item.revenue ?? 0, revShare);
      const date = new Date(item.date);
      date.setUTCHours(0, 0, 0, 0);

      const partnerId = item.partnerId ?? null;
      const geo = item.geo ?? null;

      const recordData = {
        date,
        domain: normalizedDomain,
        partnerId,
        geo,

        initialSearches: item.initialSearches ?? 0,
        feedSearches: item.feedSearches ?? 0,
        monetizedSearches: item.monetizedSearches ?? 0,

        impressions: item.monetizedSearches ?? 0,
        clicks: item.clicks ?? 0,

        ctr: item.ctr ?? null,
        rpm: null,

        grossRevenue: item.revenue ?? 0,
        netRevenue,
        revShare,
        currency: "USD",

        coverage: item.coverage ?? null,
        cpc: item.cpc ?? null,
        tq: item.tq ?? null,

        status: "Estimated",
        userId: targetUserId,
        accountId: options.accountId || null,
      };

      const existing = await prisma.bidder_YHS.findFirst({
        where: {
          date,
          domain: normalizedDomain,
          partnerId,
          geo,
          userId: targetUserId,
        },
      });

      if (existing) {
        await prisma.bidder_YHS.update({
          where: { id: existing.id },
          data: recordData,
        });
        updated++;
      } else {
        const existingOtherUser = await prisma.bidder_YHS.findFirst({
          where: {
            date,
            domain: normalizedDomain,
            partnerId,
            geo,
          },
        });

        if (existingOtherUser && existingOtherUser.userId !== targetUserId) {
          await prisma.bidder_YHS.update({
            where: { id: existingOtherUser.id },
            data: recordData,
          });
          updated++;
        } else if (!existingOtherUser) {
          await prisma.bidder_YHS.create({
            data: {
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
      console.error("[Revenue DB] YHS error:", error);
    }
  }

  // Invalidate dashboard cache after sync
  cache.invalidatePrefix("dashboard:");
  cache.invalidatePrefix("sync-status:");

  return { saved, updated, skipped, errors };
}

export async function getYhsRevenue(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    domain?: string;
    limit?: number;
  } = {},
) {
  const { startDate, endDate, domain, limit } = options;
  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (domain) where.domain = domain;

  return prisma.bidder_YHS.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function getYhsRevenueSummary(
  userId: string,
  options: { startDate?: Date; endDate?: Date } = {},
) {
  const { startDate, endDate } = options;
  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  const result = await prisma.bidder_YHS.aggregate({
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
