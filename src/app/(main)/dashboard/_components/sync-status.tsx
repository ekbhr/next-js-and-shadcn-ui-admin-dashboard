/**
 * Sync Status Component
 * 
 * Shows different views for admin vs publisher:
 * - Admin: Detailed sync status with network breakdown
 * - Publisher: Friendly message about data updates
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Database, CheckCircle, AlertCircle, CalendarClock, RefreshCw } from "lucide-react";
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
  /** If true, shows detailed admin view. If false, shows friendly publisher view */
  isAdmin?: boolean;
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

export function SyncStatus({ lastSync, recordCounts, isAdmin = false }: SyncStatusProps) {
  const overallStatus = getSyncHealthStatus(lastSync.overall);
  const hasData = recordCounts.overview > 0;

  // Publisher-friendly view
  if (!isAdmin) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {hasData ? (
                <>
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Revenue data is updated{" "}
                    <span className="font-medium text-foreground">daily at 9:00 AM (Dubai)</span>
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Your revenue data will appear here once synced
                  </span>
                </>
              )}
            </div>
            {hasData && lastSync.overall && (
              <span className="text-xs text-muted-foreground">
                Last updated: {formatLastUpdate(lastSync.overall)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin detailed view
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

/** Format date in a friendly way for publishers */
function formatLastUpdate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return "Today";
  if (diffHours < 48) return "Yesterday";
  
  return d.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric" 
  });
}

