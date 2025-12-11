"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, MousePointerClick, Eye, Globe, Users, Tag } from "lucide-react";

interface YandexReportSummaryProps {
  totals: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    userCount: number;
    domainCount: number;
    tagCount: number;
    recordCount: number;
  };
}

export function YandexReportSummary({ totals }: YandexReportSummaryProps) {
  const profit = totals.grossRevenue - totals.netRevenue;
  const profitMargin = totals.grossRevenue > 0 
    ? ((profit / totals.grossRevenue) * 100).toFixed(1) 
    : "0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Gross Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totals.grossRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Yandex earnings (USD)
          </p>
        </CardContent>
      </Card>

      {/* Net Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totals.netRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            After rev share ({profitMargin}% margin)
          </p>
        </CardContent>
      </Card>

      {/* Impressions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Impressions</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totals.impressions.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Total ad shows
          </p>
        </CardContent>
      </Card>

      {/* Clicks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clicks</CardTitle>
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totals.clicks.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            CTR: {totals.impressions > 0 
              ? ((totals.clicks / totals.impressions) * 100).toFixed(2) 
              : "0"}%
          </p>
        </CardContent>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Domains</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.domainCount}</div>
          <p className="text-xs text-muted-foreground">
            Active domains
          </p>
        </CardContent>
      </Card>

      {/* Tags/AdUnits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AdUnits</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.tagCount}</div>
          <p className="text-xs text-muted-foreground">
            Active tags
          </p>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.userCount}</div>
          <p className="text-xs text-muted-foreground">
            With Yandex data
          </p>
        </CardContent>
      </Card>

      {/* RPM */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">RPM</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totals.impressions > 0 
              ? ((totals.grossRevenue / totals.impressions) * 1000).toFixed(2) 
              : "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">
            Revenue per 1000 shows
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

