/**
 * Domain Management Library
 * 
 * Orchestrates domain operations across all ad networks (Sedo, Yandex, etc.)
 * 
 * This library:
 * - Fetches domains from all configured networks
 * - Syncs domains to Domain_Assignment table
 * - Provides unified domain lookup and management
 */

import { sedoClient } from "./sedo";
import { yandexClient } from "./yandex";
import { prisma } from "./prisma";

// Types
export interface NetworkDomain {
  domain: string;
  network: "sedo" | "yandex" | string;
  revenue?: number;
  impressions?: number;
  clicks?: number;
}

export interface DomainSyncResult {
  network: string;
  fetched: number;
  created: number;
  existing: number;
  errors: string[];
}

export interface AllNetworksSyncResult {
  success: boolean;
  results: DomainSyncResult[];
  totalFetched: number;
  totalCreated: number;
  totalExisting: number;
  totalErrors: number;
}

/**
 * Fetch domains from a specific network
 */
export async function fetchDomainsFromNetwork(
  network: "sedo" | "yandex"
): Promise<{ success: boolean; domains: NetworkDomain[]; error?: string }> {
  switch (network) {
    case "sedo":
      if (!sedoClient.isConfigured()) {
        return { success: false, domains: [], error: "Sedo not configured" };
      }
      const sedoResult = await sedoClient.getDomains();
      if (!sedoResult.success) {
        return { success: false, domains: [], error: sedoResult.error };
      }
      return {
        success: true,
        domains: sedoResult.domains.map((d) => ({
          domain: d.domain,
          network: "sedo",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };

    case "yandex":
      if (!yandexClient.isConfigured()) {
        return { success: false, domains: [], error: "Yandex not configured" };
      }
      const yandexResult = await yandexClient.getDomains();
      if (!yandexResult.success) {
        return { success: false, domains: [], error: yandexResult.error };
      }
      return {
        success: true,
        domains: yandexResult.domains.map((d) => ({
          domain: d.domain,
          network: "yandex",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };

    default:
      return { success: false, domains: [], error: `Unknown network: ${network}` };
  }
}

/**
 * Fetch domains from ALL configured networks
 */
export async function fetchDomainsFromAllNetworks(): Promise<{
  success: boolean;
  domains: NetworkDomain[];
  byNetwork: Record<string, NetworkDomain[]>;
  errors: string[];
}> {
  const allDomains: NetworkDomain[] = [];
  const byNetwork: Record<string, NetworkDomain[]> = {};
  const errors: string[] = [];

  // Fetch from Sedo
  if (sedoClient.isConfigured()) {
    console.log("[Domains] Fetching from Sedo...");
    const sedoResult = await fetchDomainsFromNetwork("sedo");
    if (sedoResult.success) {
      allDomains.push(...sedoResult.domains);
      byNetwork.sedo = sedoResult.domains;
      console.log(`[Domains] Sedo: ${sedoResult.domains.length} domains`);
    } else {
      errors.push(`Sedo: ${sedoResult.error}`);
    }
  }

  // Fetch from Yandex
  if (yandexClient.isConfigured()) {
    console.log("[Domains] Fetching from Yandex...");
    const yandexResult = await fetchDomainsFromNetwork("yandex");
    if (yandexResult.success) {
      allDomains.push(...yandexResult.domains);
      byNetwork.yandex = yandexResult.domains;
      console.log(`[Domains] Yandex: ${yandexResult.domains.length} domains`);
    } else {
      errors.push(`Yandex: ${yandexResult.error}`);
    }
  }

  return {
    success: errors.length === 0,
    domains: allDomains,
    byNetwork,
    errors,
  };
}

/**
 * Sync domains to Domain_Assignment table
 * 
 * @param domains - List of domains to sync
 * @param fallbackUserId - User ID to assign new domains to (required by schema)
 * @param defaultRevShare - Default revShare for new domains
 */
export async function syncDomainsToDatabase(
  domains: NetworkDomain[],
  fallbackUserId: string,
  defaultRevShare: number = 80
): Promise<DomainSyncResult[]> {
  const results: DomainSyncResult[] = [];

  // Group domains by network
  const byNetwork = domains.reduce((acc, d) => {
    if (!acc[d.network]) acc[d.network] = [];
    acc[d.network].push(d);
    return acc;
  }, {} as Record<string, NetworkDomain[]>);

  for (const [network, networkDomains] of Object.entries(byNetwork)) {
    const result: DomainSyncResult = {
      network,
      fetched: networkDomains.length,
      created: 0,
      existing: 0,
      errors: [],
    };

    for (const item of networkDomains) {
      try {
        const normalizedDomain = item.domain.toLowerCase().trim();

        // Check if assignment exists
        const existing = await prisma.domain_Assignment.findFirst({
          where: {
            domain: normalizedDomain,
            network: network,
          },
        });

        if (existing) {
          result.existing++;
        } else {
          // Create new assignment with fallback user
          await prisma.domain_Assignment.create({
            data: {
              domain: normalizedDomain,
              network: network,
              userId: fallbackUserId,
              revShare: defaultRevShare,
              isActive: true,
              notes: `Auto-synced from ${network}`,
            },
          });
          result.created++;
        }
      } catch (error) {
        result.errors.push(
          `${item.domain}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Sync domains from all networks to database
 * Main entry point for domain sync
 * 
 * @param fallbackUserId - User ID to assign new domains to (required by schema)
 * @param defaultRevShare - Default revShare for new domains
 */
export async function syncAllNetworkDomains(
  fallbackUserId: string,
  defaultRevShare: number = 80
): Promise<AllNetworksSyncResult> {
  console.log("[Domains] Starting sync from all networks...");

  // Fetch from all networks
  const fetchResult = await fetchDomainsFromAllNetworks();

  if (fetchResult.domains.length === 0) {
    return {
      success: fetchResult.errors.length === 0,
      results: [],
      totalFetched: 0,
      totalCreated: 0,
      totalExisting: 0,
      totalErrors: fetchResult.errors.length,
    };
  }

  // Sync to database with fallback user
  const syncResults = await syncDomainsToDatabase(
    fetchResult.domains,
    fallbackUserId,
    defaultRevShare
  );

  // Calculate totals
  const totalFetched = syncResults.reduce((sum, r) => sum + r.fetched, 0);
  const totalCreated = syncResults.reduce((sum, r) => sum + r.created, 0);
  const totalExisting = syncResults.reduce((sum, r) => sum + r.existing, 0);
  const totalErrors = syncResults.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(`[Domains] Sync complete: ${totalFetched} fetched, ${totalCreated} created, ${totalExisting} existing`);

  return {
    success: totalErrors === 0,
    results: syncResults,
    totalFetched,
    totalCreated,
    totalExisting,
    totalErrors,
  };
}

/**
 * Get domain owner from Domain_Assignment
 */
export async function getDomainOwner(
  domain: string,
  network: string
): Promise<string | null> {
  const normalizedDomain = domain.toLowerCase().trim();

  const assignment = await prisma.domain_Assignment.findFirst({
    where: {
      domain: normalizedDomain,
      network: network,
      isActive: true,
    },
    select: { userId: true },
  });

  return assignment?.userId || null;
}

/**
 * Get all domain owners for a network
 * Returns a Map of domain -> userId
 */
export async function getAllDomainOwners(
  network: string
): Promise<Map<string, string>> {
  const assignments = await prisma.domain_Assignment.findMany({
    where: {
      network: network,
      isActive: true,
      userId: { not: null },
    },
    select: {
      domain: true,
      userId: true,
    },
  });

  const ownerMap = new Map<string, string>();
  for (const a of assignments) {
    if (a.domain && a.userId) {
      ownerMap.set(a.domain.toLowerCase().trim(), a.userId);
    }
  }

  return ownerMap;
}

/**
 * Get domains assigned to a specific user
 */
export async function getUserDomains(
  userId: string,
  network?: string
): Promise<string[]> {
  const where: { userId: string; network?: string; isActive: boolean } = {
    userId,
    isActive: true,
  };

  if (network) {
    where.network = network;
  }

  const assignments = await prisma.domain_Assignment.findMany({
    where,
    select: { domain: true },
  });

  return assignments.map((a) => a.domain).filter((d): d is string => d !== null);
}

/**
 * Assign a domain to a user
 */
export async function assignDomainToUser(
  domain: string,
  network: string,
  userId: string,
  revShare?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedDomain = domain.toLowerCase().trim();

    // Find existing assignment
    const existing = await prisma.domain_Assignment.findFirst({
      where: {
        domain: normalizedDomain,
        network: network,
      },
    });

    if (existing) {
      // Update existing
      await prisma.domain_Assignment.update({
        where: { id: existing.id },
        data: {
          userId,
          revShare: revShare ?? existing.revShare,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      await prisma.domain_Assignment.create({
        data: {
          domain: normalizedDomain,
          network,
          userId,
          revShare: revShare ?? 80,
          isActive: true,
        },
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Assignment failed",
    };
  }
}

/**
 * Unassign a domain from a user (set userId to null)
 */
export async function unassignDomain(
  domain: string,
  network: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedDomain = domain.toLowerCase().trim();

    await prisma.domain_Assignment.updateMany({
      where: {
        domain: normalizedDomain,
        network: network,
      },
      data: {
        userId: null,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unassignment failed",
    };
  }
}

/**
 * Get all domain assignments with user info
 */
export async function getAllDomainAssignments(options?: {
  network?: string;
  userId?: string;
  includeUnassigned?: boolean;
}): Promise<
  Array<{
    id: string;
    domain: string;
    network: string;
    revShare: number;
    isActive: boolean;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const where: {
    network?: string;
    userId?: string | { not: null } | null;
  } = {};

  if (options?.network) {
    where.network = options.network;
  }

  if (options?.userId) {
    where.userId = options.userId;
  } else if (!options?.includeUnassigned) {
    // By default, only show assigned domains
    where.userId = { not: null };
  }

  const assignments = await prisma.domain_Assignment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ network: "asc" }, { domain: "asc" }],
  });

  return assignments.map((a) => ({
    id: a.id,
    domain: a.domain,
    network: a.network,
    revShare: a.revShare,
    isActive: a.isActive,
    userId: a.userId,
    userName: a.user?.name || null,
    userEmail: a.user?.email || null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

/**
 * Get configured networks
 */
export function getConfiguredNetworks(): string[] {
  const networks: string[] = [];

  if (sedoClient.isConfigured()) {
    networks.push("sedo");
  }

  if (yandexClient.isConfigured()) {
    networks.push("yandex");
  }

  return networks;
}

/**
 * Check network configuration status
 */
export function getNetworkStatus(): Record<
  string,
  { configured: boolean; name: string }
> {
  return {
    sedo: {
      configured: sedoClient.isConfigured(),
      name: "Sedo",
    },
    yandex: {
      configured: yandexClient.isConfigured(),
      name: "Yandex Advertising Network",
    },
  };
}

