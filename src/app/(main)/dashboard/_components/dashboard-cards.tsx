/**
 * Dashboard Summary Cards
 * 
 * Shows key metrics for the selected period.
 * Gross revenue is only shown to admin users.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Eye, MousePointer } from "lucide-react";

interface DashboardCardsProps {
  totals: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    rpm: number;
  };
  showGrossRevenue?: boolean; // Only true for admin users
}

export function DashboardCards({ totals, showGrossRevenue = false }: DashboardCardsProps) {
  const cards = [
    // Gross Revenue - only for admins
    ...(showGrossRevenue ? [{
      title: "Gross Revenue",
      value: `€${totals.grossRevenue.toFixed(2)}`,
      description: `RPM: €${totals.rpm.toFixed(2)}`,
      icon: DollarSign,
      color: "text-blue-600",
    }] : []),
    {
      title: "Revenue",
      value: `€${totals.netRevenue.toFixed(2)}`,
      description: showGrossRevenue ? "Your share (after revShare)" : "Total earnings",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Impressions",
      value: totals.impressions.toLocaleString(),
      description: "Total page views",
      icon: Eye,
      color: "text-purple-600",
    },
    {
      title: "Clicks",
      value: totals.clicks.toLocaleString(),
      description: `CTR: ${totals.ctr}%`,
      icon: MousePointer,
      color: "text-orange-600",
    },
  ];

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${showGrossRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

