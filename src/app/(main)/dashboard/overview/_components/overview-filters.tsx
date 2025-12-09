"use client";

/**
 * Overview Filters
 * 
 * Filter by network and date range.
 */

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OverviewFiltersProps {
  networks: string[];
  currentNetwork?: string;
  currentDays: number;
}

export function OverviewFilters({
  networks,
  currentNetwork,
  currentDays,
}: OverviewFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/overview?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Network Filter */}
      <Select
        value={currentNetwork || "all"}
        onValueChange={(value) => updateFilter("network", value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Networks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Networks</SelectItem>
          {networks.map((network) => (
            <SelectItem key={network} value={network}>
              {network.charAt(0).toUpperCase() + network.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select
        value={currentDays.toString()}
        onValueChange={(value) => updateFilter("days", value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="31">Last 31 days</SelectItem>
          <SelectItem value="60">Last 60 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

