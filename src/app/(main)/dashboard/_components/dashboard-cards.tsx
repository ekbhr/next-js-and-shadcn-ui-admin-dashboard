/**
 * Dashboard Summary Cards
 * 
 * Shows key metrics for the selected period.
 * Gross revenue is only shown to admin users.
 * Network breakdown shows revenue by network (Sedo, Yandex, etc.)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Eye, MousePointer, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface NetworkData {
  network: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
}

interface ChangeData {
  grossRevenue: { value: number; percent: number };
  netRevenue: { value: number; percent: number };
  impressions: { value: number; percent: number };
  clicks: { value: number; percent: number };
}

interface DashboardCardsProps {
  totals: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    rpm: number;
  };
  byNetwork?: NetworkData[];
  comparison?: ChangeData; // Comparison with previous period
  showGrossRevenue?: boolean; // Only true for admin users
}

// Network display config - now uses centralized ad-networks.ts

// Change indicator component
function ChangeIndicator({ percent, value, prefix = "" }: { percent: number; value?: number; prefix?: string }) {
  if (percent === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }
  
  const isPositive = percent > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? "+" : ""}{percent.toFixed(1)}%
      {value !== undefined && (
        <span className="text-muted-foreground">
          ({isPositive ? "+" : ""}{prefix}{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value.toLocaleString()})
        </span>
      )}
    </span>
  );
}

export function DashboardCards({ totals, byNetwork = [], comparison, showGrossRevenue = false }: DashboardCardsProps) {
  // Format network breakdown for display - uses centralized ad-networks.ts
  const networkBreakdown = byNetwork.map((n) => {
    const colors = getNetworkColors(n.network);
    return {
      ...n,
      label: getNetworkName(n.network, true), // short name
      badgeClass: colors.badge,
    };
  }).sort((a, b) => b.netRevenue - a.netRevenue);

  const cards = [
    // Gross Revenue - only for admins
    ...(showGrossRevenue ? [{
      title: "Gross Revenue",
      value: `€${totals.grossRevenue.toFixed(2)}`,
      description: `RPM: €${totals.rpm.toFixed(2)}`,
      icon: DollarSign,
      color: "text-blue-600",
      change: comparison?.grossRevenue,
      changePrefix: "€",
    }] : []),
    {
      title: "Revenue",
      value: `€${totals.netRevenue.toFixed(2)}`,
      description: showGrossRevenue ? "Your share (after revShare)" : "Total earnings",
      icon: TrendingUp,
      color: "text-green-600",
      change: comparison?.netRevenue,
      changePrefix: "€",
    },
    {
      title: "Impressions",
      value: totals.impressions.toLocaleString(),
      description: "Total page views",
      icon: Eye,
      color: "text-purple-600",
      change: comparison?.impressions,
      changePrefix: "",
    },
    {
      title: "Clicks",
      value: totals.clicks.toLocaleString(),
      description: `CTR: ${totals.ctr}%`,
      icon: MousePointer,
      color: "text-orange-600",
      change: comparison?.clicks,
      changePrefix: "",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main metrics cards */}
      <div className={`grid gap-4 md:grid-cols-2 ${showGrossRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.description}</p>
                {card.change && (
                  <ChangeIndicator 
                    percent={card.change.percent} 
                    value={card.change.value}
                    prefix={card.changePrefix}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network breakdown */}
      {networkBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue by Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {networkBreakdown.map((network) => (
                <div key={network.network} className="flex items-center gap-2">
                  <Badge variant="secondary" className={network.badgeClass}>
                    {network.label}
                  </Badge>
                  <span className="text-sm font-medium">
                    €{network.netRevenue.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({network.impressions.toLocaleString()} imp)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

