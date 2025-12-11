/**
 * Admin Settings Page
 * 
 * System configuration and data management:
 * - Revenue Configuration (Default RevShare)
 * - API Connections status
 * - Sync Schedule display
 * - Data Management (Sync & Clear)
 * - Email Notifications
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/roles";
import { getSystemSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { sedoClient } from "@/lib/sedo";
import { yandexClient } from "@/lib/yandex";

import { RevenueConfigSection } from "./_components/revenue-config-section";
import { NetworkAccountsSection } from "./_components/network-accounts-section";
import { ApiConnectionsSection } from "./_components/api-connections-section";
import { SyncScheduleSection } from "./_components/sync-schedule-section";
import { DataManagementSection } from "./_components/data-management-section";
import { EmailNotificationsSection } from "./_components/email-notifications-section";

export const metadata: Metadata = {
  title: "RevEngine Media - Admin Settings",
};

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isAdmin(session.user.role)) {
    redirect("/dashboard/unauthorized");
  }

  // Get system settings
  const settings = await getSystemSettings();

  // Get record counts for data management display
  const [sedoCount, yandexCount, overviewCount, domainCount, sedoAccountCount, yandexAccountCount] = await Promise.all([
    prisma.bidder_Sedo.count(),
    prisma.bidder_Yandex.count(),
    prisma.overview_Report.count(),
    prisma.domain_Assignment.count(),
    prisma.networkAccount.count({ where: { network: "sedo", isActive: true } }),
    prisma.networkAccount.count({ where: { network: "yandex", isActive: true } }),
  ]);

  // Get API connection status
  // Check both: database accounts OR environment variables
  const apiStatus = {
    sedo: {
      configured: sedoAccountCount > 0 || sedoClient.isConfigured(),
      lastSync: settings.lastSedoSync,
      accountCount: sedoAccountCount,
    },
    yandex: {
      configured: yandexAccountCount > 0 || yandexClient.isConfigured(),
      lastSync: settings.lastYandexSync,
      accountCount: yandexAccountCount,
    },
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">
          System configuration and data management
        </p>
      </div>

      <div className="grid gap-6">
        {/* Revenue Configuration */}
        <RevenueConfigSection defaultRevShare={settings.defaultRevShare} />

        {/* Network Accounts (Multi-Account Support) */}
        <NetworkAccountsSection />

        {/* API Connections */}
        <ApiConnectionsSection apiStatus={apiStatus} />

        {/* Sync Schedule */}
        <SyncScheduleSection />

        {/* Data Management */}
        <DataManagementSection
          recordCounts={{
            sedo: sedoCount,
            yandex: yandexCount,
            overview: overviewCount,
            domains: domainCount,
          }}
          lastDomainSync={settings.lastDomainSync}
        />

        {/* Email Notifications */}
        <EmailNotificationsSection
          emailOnSyncFailure={settings.emailOnSyncFailure}
          emailWeeklySummary={settings.emailWeeklySummary}
          adminEmail={settings.adminEmail}
        />
      </div>
    </div>
  );
}

