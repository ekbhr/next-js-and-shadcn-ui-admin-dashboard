"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncYandexButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports/yandex/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      router.refresh();
    } catch (error) {
      console.error("Sync error:", error);
      alert(error instanceof Error ? error.message : "Failed to sync Yandex data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing..." : "Sync Yandex Data"}
    </Button>
  );
}

