/**
 * System Settings Library
 * 
 * Manages system-wide configuration stored in the database.
 * Uses a singleton pattern - only one SystemSettings record exists.
 */

import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "system";

export interface SystemSettings {
  defaultRevShare: number;
  emailOnSyncFailure: boolean;
  emailWeeklySummary: boolean;
  adminEmail: string | null;
  lastSedoSync: Date | null;
  lastYandexSync: Date | null;
  lastDomainSync: Date | null;
}

/**
 * Get system settings (creates default if not exists)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: SETTINGS_ID,
        defaultRevShare: 80,
        emailOnSyncFailure: true,
        emailWeeklySummary: false,
      },
    });
  }

  return {
    defaultRevShare: settings.defaultRevShare,
    emailOnSyncFailure: settings.emailOnSyncFailure,
    emailWeeklySummary: settings.emailWeeklySummary,
    adminEmail: settings.adminEmail,
    lastSedoSync: settings.lastSedoSync,
    lastYandexSync: settings.lastYandexSync,
    lastDomainSync: settings.lastDomainSync,
  };
}

/**
 * Update system settings
 */
export async function updateSystemSettings(
  updates: Partial<Omit<SystemSettings, "lastSedoSync" | "lastYandexSync" | "lastDomainSync">>
): Promise<SystemSettings> {
  const settings = await prisma.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    update: updates,
    create: {
      id: SETTINGS_ID,
      defaultRevShare: updates.defaultRevShare ?? 80,
      emailOnSyncFailure: updates.emailOnSyncFailure ?? true,
      emailWeeklySummary: updates.emailWeeklySummary ?? false,
      adminEmail: updates.adminEmail ?? null,
    },
  });

  return {
    defaultRevShare: settings.defaultRevShare,
    emailOnSyncFailure: settings.emailOnSyncFailure,
    emailWeeklySummary: settings.emailWeeklySummary,
    adminEmail: settings.adminEmail,
    lastSedoSync: settings.lastSedoSync,
    lastYandexSync: settings.lastYandexSync,
    lastDomainSync: settings.lastDomainSync,
  };
}

/**
 * Update last sync timestamp for a network
 */
export async function updateLastSync(
  network: "sedo" | "yandex" | "domains"
): Promise<void> {
  const fieldMap = {
    sedo: "lastSedoSync",
    yandex: "lastYandexSync",
    domains: "lastDomainSync",
  } as const;

  await prisma.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { [fieldMap[network]]: new Date() },
    create: {
      id: SETTINGS_ID,
      [fieldMap[network]]: new Date(),
    },
  });
}

/**
 * Get default RevShare (quick access)
 */
export async function getDefaultRevShare(): Promise<number> {
  const settings = await getSystemSettings();
  return settings.defaultRevShare;
}

/**
 * Check if email notifications are enabled
 */
export async function shouldSendSyncFailureEmail(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.emailOnSyncFailure;
}

