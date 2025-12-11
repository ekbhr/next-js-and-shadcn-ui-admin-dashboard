/**
 * Sync Status Component
 * 
 * Shows the last sync time for each network and record counts.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Database, CheckCircle, AlertCircle } from "lucide-react";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface SyncStatusProps {
  lastSync: {
    sedo: Date | null;
    yandex: Date | null;
    overall: Date | null;
  };
  recordCounts: {
    sedo: number;
    yandex: number;
    overview: number;
  };
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString();
}

function getSyncHealthStatus(date: Date | null): "healthy" | "warning" | "error" {
  if (!date) return "error";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) return "healthy";
  if (diffHours < 48) return "warning";
  return "error";
}

export function SyncStatus({ lastSync, recordCounts }: SyncStatusProps) {
  const overallStatus = getSyncHealthStatus(lastSync.overall);

  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Overall sync status */}
          <div className="flex items-center gap-2">
            {overallStatus === "healthy" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : overallStatus === "warning" ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">
              Last sync: <span className="font-medium text-foreground">{formatTimeAgo(lastSync.overall)}</span>
            </span>
          </div>

          {/* Network breakdown */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={getNetworkColors("sedo").outlineBadge}>
                {getNetworkName("sedo", true)}
              </Badge>
              <span className="text-muted-foreground">
                {recordCounts.sedo.toLocaleString()} records
              </span>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{formatTimeAgo(lastSync.sedo)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={getNetworkColors("yandex").outlineBadge}>
                {getNetworkName("yandex", true)}
              </Badge>
              <span className="text-muted-foreground">
                {recordCounts.yandex.toLocaleString()} records
              </span>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{formatTimeAgo(lastSync.yandex)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {recordCounts.overview.toLocaleString()} total
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

