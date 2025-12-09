"use client";

/**
 * Sync Domains Button
 * 
 * Triggers domain sync from Sedo API.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/domains/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Synced! ${data.sync.created} new, ${data.sync.existing} existing`,
        });
        router.refresh();
      } else {
        setResult({
          success: false,
          message: data.error || "Sync failed",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      setResult({
        success: false,
        message: "Failed to sync domains",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-sm ${
            result.success ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.message}
        </span>
      )}
      <Button onClick={handleSync} disabled={syncing}>
        {syncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Domains
          </>
        )}
      </Button>
    </div>
  );
}

