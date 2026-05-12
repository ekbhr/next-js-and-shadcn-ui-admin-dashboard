/**
 * Yahoo (Advertiv) revenue broken down by Sub ID + Campaign for the dashboard period.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export type YahooCampaignRow = {
  subId: string;
  campaignId: string | null;
  label: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
};

interface YahooCampaignBreakdownProps {
  rows: YahooCampaignRow[];
  showGrossRevenue?: boolean;
}

export function YahooCampaignBreakdown({
  rows,
  showGrossRevenue = false,
}: YahooCampaignBreakdownProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-5 w-5" />
          Yahoo — by campaign
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Net / gross per Sub ID and campaign in this period
        </p>
      </CardHeader>
      <CardContent className="max-h-[320px] overflow-y-auto pr-1">
        <div className="space-y-3 text-sm">
          {rows.map((row, index) => (
            <div
              key={`${row.subId}-${row.campaignId ?? "null"}-${index}`}
              className="flex items-start justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate" title={`${row.subId} / ${row.campaignId ?? ""}`}>
                  {row.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.impressions.toLocaleString()} impr. · {row.clicks.toLocaleString()} clicks
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-green-600">
                  $
                  {showGrossRevenue
                    ? row.grossRevenue.toFixed(2)
                    : row.netRevenue.toFixed(2)}
                </p>
                {showGrossRevenue && (
                  <p className="text-xs text-muted-foreground">Net ${row.netRevenue.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
