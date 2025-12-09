"use client";

/**
 * Period Toggle
 * 
 * Toggle between current month and last month.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PeriodToggleProps {
  currentPeriod: "current" | "last";
}

export function PeriodToggle({ currentPeriod }: PeriodToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleToggle = (period: "current" | "last") => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "current") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={currentPeriod === "current" ? "default" : "outline"}
        size="sm"
        onClick={() => handleToggle("current")}
      >
        This Month
      </Button>
      <Button
        variant={currentPeriod === "last" ? "default" : "outline"}
        size="sm"
        onClick={() => handleToggle("last")}
      >
        Last Month
      </Button>
    </div>
  );
}

