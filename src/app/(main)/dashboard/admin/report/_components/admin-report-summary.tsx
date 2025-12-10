"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Globe, Eye, MousePointer } from "lucide-react";

interface AdminReportSummaryProps {
  totals: {
    grossRevenue: number;
    netRevenue: number;
    impressions: number;
    clicks: number;
    userCount: number;
    domainCount: number;
  };
}

export function AdminReportSummary({ totals }: AdminReportSummaryProps) {
  const cards = [
    {
      title: "Gross Revenue",
      value: `€${totals.grossRevenue.toFixed(2)}`,
      description: "Total before revShare",
      icon: DollarSign,
      color: "text-blue-600",
    },
    {
      title: "Net Revenue",
      value: `€${totals.netRevenue.toFixed(2)}`,
      description: "Total after revShare",
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
      description: `CTR: ${totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0}%`,
      icon: MousePointer,
      color: "text-orange-600",
    },
    {
      title: "Active Users",
      value: totals.userCount.toString(),
      description: "Users with revenue",
      icon: Users,
      color: "text-cyan-600",
    },
    {
      title: "Domains",
      value: totals.domainCount.toString(),
      description: "Unique domains",
      icon: Globe,
      color: "text-pink-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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

