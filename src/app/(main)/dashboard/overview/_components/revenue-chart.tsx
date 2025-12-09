"use client";

/**
 * Revenue Chart
 * 
 * Line chart showing daily revenue trend
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RevenueRecord {
  id: string;
  date: Date;
  network: string;
  domain: string | null;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
}

interface RevenueChartProps {
  data: RevenueRecord[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Transform data for chart (group by date)
  const chartData = data
    .reduce((acc: Array<{ date: string; gross: number; net: number }>, record) => {
      const dateStr = new Date(record.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      const existing = acc.find((item) => item.date === dateStr);
      if (existing) {
        existing.gross += record.grossRevenue;
        existing.net += record.netRevenue;
      } else {
        acc.push({
          date: dateStr,
          gross: record.grossRevenue,
          net: record.netRevenue,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No data to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `€${value.toFixed(2)}`}
            />
            <Tooltip 
              formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
              labelStyle={{ fontWeight: "bold" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="gross"
              name="Gross Revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net Revenue"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

