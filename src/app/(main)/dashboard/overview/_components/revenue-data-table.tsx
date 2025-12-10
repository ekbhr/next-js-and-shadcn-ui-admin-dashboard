"use client";

/**
 * Revenue DataTable with Pagination
 * 
 * Full-featured table with sorting, pagination, and search.
 */

import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

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

interface RevenueDataTableProps {
  data: RevenueRecord[];
  showGrossRevenue?: boolean; // Only true for admin users
}

export function RevenueDataTable({ data, showGrossRevenue = false }: RevenueDataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!search) return data;
    const searchLower = search.toLowerCase();
    return data.filter(
      (record) =>
        record.domain?.toLowerCase().includes(searchLower) ||
        record.network.toLowerCase().includes(searchLower)
    );
  }, [data, search]);

  // Paginate
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Network badge color
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case "sedo":
        return "bg-blue-500 hover:bg-blue-600";
      case "yandex":
        return "bg-red-500 hover:bg-red-600";
      case "google":
        return "bg-green-500 hover:bg-green-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No revenue data for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Details</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredData.length} records
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by domain or network..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
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
              {showGrossRevenue && <TableHead className="text-right">Gross</TableHead>}
              <TableHead className="text-right">{showGrossRevenue ? "Net" : "Revenue"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {formatDate(record.date)}
                </TableCell>
                <TableCell>
                  <Badge className={getNetworkColor(record.network)}>
                    {record.network.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {record.domain || "All Domains"}
                </TableCell>
                <TableCell className="text-right">
                  {record.impressions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {record.clicks.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {record.ctr !== null ? `${record.ctr}%` : "-"}
                </TableCell>
                {showGrossRevenue && (
                  <TableCell className="text-right font-medium">
                    €{record.grossRevenue.toFixed(2)}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium text-green-600">
                  €{record.netRevenue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setPage(pageNum)}
                      className="h-8 w-8 text-xs"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

