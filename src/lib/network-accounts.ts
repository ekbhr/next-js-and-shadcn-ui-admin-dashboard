/**
 * Network Accounts Library
 * 
 * Manage multiple ad network accounts (Sedo, Yandex, etc.)
 * with encrypted credential storage.
 */

import { prisma } from "@/lib/prisma";
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  type SedoCredentials,
  type YandexCredentials,
  type NetworkCredentials,
} from "@/lib/encryption";

// ============================================
// Types
// ============================================

export interface NetworkAccountWithCredentials {
  id: string;
  network: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  credentials: NetworkCredentials;
}

export interface NetworkAccountSummary {
  id: string;
  network: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  domainCount: number;
}

// ============================================
// Account Management
// ============================================

/**
 * Create a new network account with encrypted credentials.
 */
export async function createNetworkAccount(
  network: "sedo" | "yandex",
  name: string,
  credentials: NetworkCredentials,
  isDefault = false
): Promise<{ id: string }> {
  // If this is the default, unset other defaults for this network
  if (isDefault) {
    await prisma.networkAccount.updateMany({
      where: { network, isDefault: true },
      data: { isDefault: false },
    });
  }
  
  const encryptedCredentials = encryptObject(credentials);
  
  const account = await prisma.networkAccount.create({
    data: {
      network,
      name,
      credentials: encryptedCredentials,
      isDefault,
    },
    select: { id: true },
  });
  
  return account;
}

/**
 * Update an existing network account.
 */
export async function updateNetworkAccount(
  id: string,
  data: {
    name?: string;
    credentials?: NetworkCredentials;
    isActive?: boolean;
    isDefault?: boolean;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  
  if (data.credentials !== undefined) {
    updateData.credentials = encryptObject(data.credentials);
  }
  
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }
  
  if (data.isDefault !== undefined) {
    // If setting as default, unset other defaults for this network
    if (data.isDefault) {
      const account = await prisma.networkAccount.findUnique({
        where: { id },
        select: { network: true },
      });
      
      if (account) {
        await prisma.networkAccount.updateMany({
          where: { network: account.network, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }
    updateData.isDefault = data.isDefault;
  }
  
  await prisma.networkAccount.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a network account.
 * Note: Domains will have their accountId set to null (SetNull).
 */
export async function deleteNetworkAccount(id: string): Promise<void> {
  await prisma.networkAccount.delete({
    where: { id },
  });
}

/**
 * Get all accounts for a network (without decrypted credentials).
 */
export async function getNetworkAccounts(
  network?: "sedo" | "yandex"
): Promise<NetworkAccountSummary[]> {
  const accounts = await prisma.networkAccount.findMany({
    where: network ? { network } : undefined,
    include: {
      _count: {
        select: { domains: true },
      },
    },
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" },
    ],
  });
  
  return accounts.map((acc) => ({
    id: acc.id,
    network: acc.network,
    name: acc.name,
    isActive: acc.isActive,
    isDefault: acc.isDefault,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
    domainCount: acc._count.domains,
  }));
}

/**
 * Get a single account with decrypted credentials.
 */
export async function getNetworkAccountWithCredentials(
  id: string
): Promise<NetworkAccountWithCredentials | null> {
  const account = await prisma.networkAccount.findUnique({
    where: { id },
  });
  
  if (!account) return null;
  
  return {
    id: account.id,
    network: account.network,
    name: account.name,
    isActive: account.isActive,
    isDefault: account.isDefault,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    credentials: decryptObject<NetworkCredentials>(account.credentials),
  };
}

/**
 * Get all active accounts for a network with decrypted credentials.
 * Used by sync jobs to iterate over accounts.
 */
export async function getActiveAccountsWithCredentials(
  network: "sedo" | "yandex"
): Promise<NetworkAccountWithCredentials[]> {
  const accounts = await prisma.networkAccount.findMany({
    where: { network, isActive: true },
    orderBy: { isDefault: "desc" },
  });
  
  return accounts.map((acc) => ({
    id: acc.id,
    network: acc.network,
    name: acc.name,
    isActive: acc.isActive,
    isDefault: acc.isDefault,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
    credentials: decryptObject<NetworkCredentials>(acc.credentials),
  }));
}

/**
 * Get the default account for a network.
 */
export async function getDefaultAccount(
  network: "sedo" | "yandex"
): Promise<NetworkAccountWithCredentials | null> {
  const account = await prisma.networkAccount.findFirst({
    where: { network, isDefault: true, isActive: true },
  });
  
  if (!account) {
    // Fall back to first active account
    const fallback = await prisma.networkAccount.findFirst({
      where: { network, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    
    if (!fallback) return null;
    
    return {
      id: fallback.id,
      network: fallback.network,
      name: fallback.name,
      isActive: fallback.isActive,
      isDefault: fallback.isDefault,
      createdAt: fallback.createdAt,
      updatedAt: fallback.updatedAt,
      credentials: decryptObject<NetworkCredentials>(fallback.credentials),
    };
  }
  
  return {
    id: account.id,
    network: account.network,
    name: account.name,
    isActive: account.isActive,
    isDefault: account.isDefault,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    credentials: decryptObject<NetworkCredentials>(account.credentials),
  };
}

// ============================================
// Migration Helper
// ============================================

/**
 * Migrate existing env var credentials to a database account.
 * This is a one-time helper for transitioning from single to multi-account.
 */
export async function migrateEnvCredentialsToDatabase(
  network: "sedo" | "yandex"
): Promise<{ success: boolean; message: string }> {
  // Check if any accounts already exist
  const existingCount = await prisma.networkAccount.count({
    where: { network },
  });
  
  if (existingCount > 0) {
    return {
      success: false,
      message: `${network} accounts already exist in database. Skipping migration.`,
    };
  }
  
  try {
    if (network === "sedo") {
      const partnerId = process.env.SEDO_PARTNER_ID;
      const signKey = process.env.SEDO_SIGN_KEY;
      const username = process.env.SEDO_USERNAME;
      const password = process.env.SEDO_PASSWORD;
      
      if (!partnerId || !signKey || !username || !password) {
        return {
          success: false,
          message: "Missing Sedo environment variables. Cannot migrate.",
        };
      }
      
      await createNetworkAccount(
        "sedo",
        "Primary Sedo Account",
        { partnerId, signKey, username, password },
        true // Set as default
      );
      
      return {
        success: true,
        message: "Successfully migrated Sedo credentials to database.",
      };
    }
    
    if (network === "yandex") {
      const oauthToken = process.env.YANDEX_API;
      
      if (!oauthToken) {
        return {
          success: false,
          message: "Missing YANDEX_API environment variable. Cannot migrate.",
        };
      }
      
      await createNetworkAccount(
        "yandex",
        "Primary Yandex Account",
        { oauthToken },
        true // Set as default
      );
      
      return {
        success: true,
        message: "Successfully migrated Yandex credentials to database.",
      };
    }
    
    return {
      success: false,
      message: `Unknown network: ${network}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

