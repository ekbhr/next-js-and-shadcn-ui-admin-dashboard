"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export function SyncDataButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      // Sync revenue data from Sedo
      const response = await fetch("/api/reports/sedo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✓ Synced: ${data.sync.saved} new, ${data.sync.updated} updated, ${data.sync.skipped || 0} skipped`);
        router.refresh();
      } else {
        setResult(`✗ ${data.error || "Sync failed"}`);
      }
    } catch (error) {
      setResult(`✗ ${error instanceof Error ? error.message : "Sync failed"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-sm ${result.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
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
            Sync Revenue Data
          </>
        )}
      </Button>
    </div>
  );
}

