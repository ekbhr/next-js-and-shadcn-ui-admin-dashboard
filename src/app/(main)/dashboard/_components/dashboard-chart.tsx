"use client";

/**
 * Dashboard Revenue Chart
 * 
 * Area chart showing daily revenue trend (all networks combined).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyData {
  date: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
}

interface DashboardChartProps {
  dailyData: DailyData[];
}

export function DashboardChart({ dailyData }: DashboardChartProps) {
  // Format data for chart
  const chartData = dailyData.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    gross: Math.round(day.grossRevenue * 100) / 100,
    net: Math.round(day.netRevenue * 100) / 100,
  }));

  if (dailyData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-medium mb-2">{label}</p>
                      <p className="text-sm text-blue-600">
                        Gross: €{Number(payload[0]?.value ?? 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600">
                        Net: €{Number(payload[1]?.value ?? 0).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="gross"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorGross)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorNet)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

