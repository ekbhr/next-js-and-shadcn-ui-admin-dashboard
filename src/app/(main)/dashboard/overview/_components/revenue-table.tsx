/**
 * Revenue Data Table
 * 
 * Displays daily revenue breakdown
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RevenueRecord {
  id: string;
  date: Date;
  network: string;
  domain: string | null;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  rpm: number | null;
}

interface RevenueTableProps {
  data: RevenueRecord[];
}

export function RevenueTable({ data }: RevenueTableProps) {
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get network badge color
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case "sedo":
        return "bg-blue-500";
      case "yandex":
        return "bg-red-500";
      case "google":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No revenue data yet. Data will appear after the next sync.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{formatDate(record.date)}</TableCell>
                <TableCell>
                  <Badge className={getNetworkColor(record.network)}>
                    {record.network.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{record.domain || "All Domains"}</TableCell>
                <TableCell className="text-right">
                  {record.impressions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {record.clicks.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {record.ctr ? `${record.ctr}%` : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  €{record.grossRevenue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  €{record.netRevenue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

