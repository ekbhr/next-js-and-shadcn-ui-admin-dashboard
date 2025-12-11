"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

interface SyncResult {
  network: string;
  success: boolean;
  saved?: number;
  updated?: number;
  skipped?: number;
  error?: string;
}

export function SyncDataButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    const results: SyncResult[] = [];

    try {
      // Sync Sedo data
      setResult("Syncing Sedo...");
      try {
        const sedoResponse = await fetch("/api/reports/sedo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const sedoData = await sedoResponse.json();
        results.push({
          network: "Sedo",
          success: sedoData.success,
          saved: sedoData.sync?.saved,
          updated: sedoData.sync?.updated,
          skipped: sedoData.sync?.skipped,
          error: sedoData.error,
        });
      } catch (error) {
        results.push({
          network: "Sedo",
          success: false,
          error: error instanceof Error ? error.message : "Failed",
        });
      }

      // Sync Yandex data
      setResult("Syncing Yandex...");
      try {
        const yandexResponse = await fetch("/api/reports/yandex/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const yandexData = await yandexResponse.json();
        results.push({
          network: "Yandex",
          success: yandexData.success,
          saved: yandexData.sync?.saved,
          updated: yandexData.sync?.updated,
          skipped: yandexData.sync?.skipped,
          error: yandexData.error,
        });
      } catch (error) {
        results.push({
          network: "Yandex",
          success: false,
          error: error instanceof Error ? error.message : "Failed",
        });
      }

      // Build result message
      const successCount = results.filter((r) => r.success).length;
      const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0);
      const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);

      if (successCount === results.length) {
        setResult(`✓ All synced: ${totalSaved} new, ${totalUpdated} updated`);
      } else if (successCount > 0) {
        const failed = results.filter((r) => !r.success).map((r) => r.network).join(", ");
        setResult(`⚠ Partial: ${totalSaved} new, ${totalUpdated} updated. Failed: ${failed}`);
      } else {
        const errors = results.map((r) => `${r.network}: ${r.error}`).join("; ");
        setResult(`✗ ${errors}`);
      }

      router.refresh();
    } catch (error) {
      setResult(`✗ ${error instanceof Error ? error.message : "Sync failed"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-sm ${
            result.startsWith("✓")
              ? "text-green-600"
              : result.startsWith("⚠")
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {result}
        </span>
      )}
      <Button onClick={handleSync} disabled={syncing} variant="default">
        {syncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All Revenue Data
          </>
        )}
      </Button>
    </div>
  );
}

