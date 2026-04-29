"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function SyncYhsButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const onSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/reports/yhs/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "YHS sync failed");
      }

      toast.success(`YHS sync complete (${data.savedCount ?? 0} records saved)`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "YHS sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button onClick={onSync} disabled={syncing}>
      {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
      Sync YHS Now
    </Button>
  );
}
