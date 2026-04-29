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
import { advertivClient } from "./advertiv";
import { yhsClient } from "./yhs";
import { prisma } from "./prisma";
import { getActiveAccountsWithCredentials } from "./network-accounts";
import { createSedoClient } from "./sedo";
import { createYandexClient } from "./yandex";
import { createAdvertivClient } from "./advertiv";
import { createYhsClient } from "./yhs";
import { isSedoCredentials, isYandexCredentials, isAdvertivCredentials, isYhsCredentials } from "./encryption";

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
  network: "sedo" | "yandex" | "advertiv" | "yhs"
): Promise<{ success: boolean; domains: NetworkDomain[]; error?: string }> {
  const allDomains: NetworkDomain[] = [];
  const errors: string[] = [];

  const accounts = await getActiveAccountsWithCredentials(network);
  if (accounts.length > 0) {
    for (const account of accounts) {
      try {
        if (network === "sedo" && isSedoCredentials(account.credentials)) {
          const result = await createSedoClient(account.credentials, {
            accountId: account.id,
            accountName: account.name,
          }).getDomains();
          if (result.success) {
            allDomains.push(...result.domains.map((d) => ({
              domain: d.domain,
              network: "sedo",
              revenue: d.revenue,
              impressions: d.impressions,
              clicks: d.clicks,
            })));
          } else {
            errors.push(`${account.name}: ${result.error}`);
          }
        } else if (network === "yandex" && isYandexCredentials(account.credentials)) {
          const result = await createYandexClient(account.credentials, {
            accountId: account.id,
            accountName: account.name,
          }).getDomains();
          if (result.success) {
            allDomains.push(...result.domains.map((d) => ({
              domain: d.domain,
              network: "yandex",
              revenue: d.revenue,
              impressions: d.impressions,
              clicks: d.clicks,
            })));
          } else {
            errors.push(`${account.name}: ${result.error}`);
          }
        } else if (network === "advertiv" && isAdvertivCredentials(account.credentials)) {
          const result = await createAdvertivClient(account.credentials, {
            accountId: account.id,
            accountName: account.name,
          }).getDomains();
          if (result.success) {
            allDomains.push(...result.domains.map((d) => ({
              domain: d.domain,
              network: "advertiv",
              revenue: d.revenue,
              impressions: d.impressions,
              clicks: d.clicks,
            })));
          } else {
            errors.push(`${account.name}: ${result.error}`);
          }
        } else if (network === "yhs" && isYhsCredentials(account.credentials)) {
          const result = await createYhsClient(account.credentials, {
            accountId: account.id,
            accountName: account.name,
          }).getDomains();
          if (result.success) {
            allDomains.push(...result.domains.map((d) => ({
              domain: d.domain,
              network: "yhs",
              revenue: d.revenue,
              impressions: d.impressions,
              clicks: d.clicks,
            })));
          } else {
            errors.push(`${account.name}: ${result.error}`);
          }
        } else {
          errors.push(`${account.name}: Invalid credentials`);
        }
      } catch (error) {
        errors.push(`${account.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    if (allDomains.length > 0) {
      return {
        success: true,
        domains: allDomains,
        error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    }
  }

  switch (network) {
    case "sedo": {
      if (!sedoClient.isConfigured()) {
        return { success: false, domains: [], error: "Sedo not configured" };
      }
      const result = await sedoClient.getDomains();
      if (!result.success) return { success: false, domains: [], error: result.error };
      return {
        success: true,
        domains: result.domains.map((d) => ({
          domain: d.domain,
          network: "sedo",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };
    }
    case "yandex": {
      if (!yandexClient.isConfigured()) {
        return { success: false, domains: [], error: "Yandex not configured" };
      }
      const result = await yandexClient.getDomains();
      if (!result.success) return { success: false, domains: [], error: result.error };
      return {
        success: true,
        domains: result.domains.map((d) => ({
          domain: d.domain,
          network: "yandex",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };
    }
    case "advertiv": {
      if (!advertivClient.isConfigured()) {
        return { success: false, domains: [], error: "Advertiv not configured" };
      }
      const result = await advertivClient.getDomains();
      if (!result.success) return { success: false, domains: [], error: result.error };
      return {
        success: true,
        domains: result.domains.map((d) => ({
          domain: d.domain,
          network: "advertiv",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };
    }
    case "yhs": {
      if (!yhsClient.isConfigured()) {
        return { success: false, domains: [], error: "YHS not configured" };
      }
      const result = await yhsClient.getDomains();
      if (!result.success) return { success: false, domains: [], error: result.error };
      return {
        success: true,
        domains: result.domains.map((d) => ({
          domain: d.domain,
          network: "yhs",
          revenue: d.revenue,
          impressions: d.impressions,
          clicks: d.clicks,
        })),
      };
    }
    default:
      return { success: false, domains: [], error: errors.join("; ") || `Unknown network: ${network}` };
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

  // Include networks configured via DB accounts OR env vars.
  const [sedoAccounts, yandexAccounts, advertivAccounts, yhsAccounts] = await Promise.all([
    getActiveAccountsWithCredentials("sedo"),
    getActiveAccountsWithCredentials("yandex"),
    getActiveAccountsWithCredentials("advertiv"),
    getActiveAccountsWithCredentials("yhs"),
  ]);

  const shouldFetchSedo = sedoAccounts.length > 0 || sedoClient.isConfigured();
  const shouldFetchYandex = yandexAccounts.length > 0 || yandexClient.isConfigured();
  const shouldFetchAdvertiv = advertivAccounts.length > 0 || advertivClient.isConfigured();
  const shouldFetchYhs = yhsAccounts.length > 0 || yhsClient.isConfigured();

  // Fetch from Sedo
  if (shouldFetchSedo) {
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
  if (shouldFetchYandex) {
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

  // Fetch from Advertiv
  if (shouldFetchAdvertiv) {
    console.log("[Domains] Fetching from Advertiv...");
    const advertivResult = await fetchDomainsFromNetwork("advertiv");
    if (advertivResult.success) {
      allDomains.push(...advertivResult.domains);
      byNetwork.advertiv = advertivResult.domains;
      console.log(`[Domains] Advertiv: ${advertivResult.domains.length} domains`);
    } else {
      errors.push(`Advertiv: ${advertivResult.error}`);
    }
  }

  // Fetch from YHS
  if (shouldFetchYhs) {
    console.log("[Domains] Fetching from YHS...");
    const yhsResult = await fetchDomainsFromNetwork("yhs");
    if (yhsResult.success) {
      allDomains.push(...yhsResult.domains);
      byNetwork.yhs = yhsResult.domains;
      console.log(`[Domains] YHS: ${yhsResult.domains.length} domains`);
    } else {
      errors.push(`YHS: ${yhsResult.error}`);
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
 * Super admin email - used as fallback owner for unassigned domains
 */
const SUPER_ADMIN_EMAIL = "shahfaisal106@gmail.com";

/**
 * Get super admin user ID
 */
async function getSuperAdminId(): Promise<string | null> {
  const superAdmin = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN_EMAIL },
    select: { id: true },
  });
  return superAdmin?.id || null;
}

/**
 * Unassign a domain from a user (reassigns to super admin)
 * Since userId is required in the schema, we reassign to super admin instead of null
 */
export async function unassignDomain(
  domain: string,
  network: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedDomain = domain.toLowerCase().trim();

    // Get super admin ID
    const superAdminId = await getSuperAdminId();
    if (!superAdminId) {
      return {
        success: false,
        error: `Super admin (${SUPER_ADMIN_EMAIL}) not found`,
      };
    }

    await prisma.domain_Assignment.updateMany({
      where: {
        domain: normalizedDomain,
        network: network,
      },
      data: {
        userId: superAdminId,
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
  includeUnassigned?: boolean; // Kept for backwards compatibility, but all domains now have userId
}): Promise<
  Array<{
    id: string;
    domain: string;
    network: string;
    revShare: number;
    isActive: boolean;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const where: {
    network?: string;
    userId?: string;
  } = {};

  if (options?.network) {
    where.network = options.network;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }
  // Note: includeUnassigned is ignored since userId is now required in schema

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

  // Note: this check is env-var based. DB account status is handled separately where needed.
  if (sedoClient.isConfigured()) {
    networks.push("sedo");
  }

  if (yandexClient.isConfigured()) {
    networks.push("yandex");
  }

  if (advertivClient.isConfigured()) {
    networks.push("advertiv");
  }

  if (yhsClient.isConfigured()) {
    networks.push("yhs");
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
    advertiv: {
      configured: advertivClient.isConfigured(),
      name: "Yahoo",
    },
    yhs: {
      configured: yhsClient.isConfigured(),
      name: "YHS",
    },
  };
}

