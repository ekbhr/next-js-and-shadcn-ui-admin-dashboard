/**
 * Overview Summary Cards
 * 
 * Displays key metrics: Gross Revenue, Net Revenue, Impressions, Clicks
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Eye, MousePointer, TrendingUp } from "lucide-react";

interface OverviewCardsProps {
  summary: {
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    avgCtr: number;
    avgRpm: number;
  };
}

export function OverviewCards({ summary }: OverviewCardsProps) {
  const cards = [
    {
      title: "Gross Revenue",
      value: `€${summary.totalGrossRevenue.toFixed(2)}`,
      description: "Total earnings before revshare",
      icon: DollarSign,
    },
    {
      title: "Net Revenue",
      value: `€${summary.totalNetRevenue.toFixed(2)}`,
      description: "Your share (80%)",
      icon: TrendingUp,
    },
    {
      title: "Impressions",
      value: summary.totalImpressions.toLocaleString(),
      description: "Total page views",
      icon: Eye,
    },
    {
      title: "Clicks",
      value: summary.totalClicks.toLocaleString(),
      description: `CTR: ${summary.avgCtr}%`,
      icon: MousePointer,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

