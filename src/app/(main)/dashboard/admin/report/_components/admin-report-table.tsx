"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Users, FileText } from "lucide-react";

interface Report {
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
  userId: string;
  userName: string | null;
  userEmail: string;
}

interface UserTotal {
  userId: string;
  userName: string | null;
  userEmail: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
  domainCount: number;
}

interface AdminReportTableProps {
  reports: Report[];
  userTotals: UserTotal[];
}

const ITEMS_PER_PAGE = 20;

export function AdminReportTable({ reports, userTotals }: AdminReportTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReports = reports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

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

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users" className="gap-2">
          <Users className="h-4 w-4" />
          By User
        </TabsTrigger>
        <TabsTrigger value="details" className="gap-2">
          <FileText className="h-4 w-4" />
          Detailed Records
        </TabsTrigger>
      </TabsList>

      {/* User Totals Tab */}
      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by User</CardTitle>
            <CardDescription>
              Aggregated totals for each user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Domains</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Gross Revenue</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userTotals.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.userName || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{user.domainCount}</TableCell>
                    <TableCell className="text-right">
                      {user.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      €{user.grossRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      €{user.netRevenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {userTotals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Detailed Records Tab */}
      <TabsContent value="details">
        <Card>
          <CardHeader>
            <CardTitle>Detailed Revenue Records ({reports.length})</CardTitle>
            <CardDescription>
              Individual revenue records from all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {formatDate(report.date)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {report.userName || report.userEmail}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getNetworkColor(report.network)}>
                        {report.network.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {report.domain || "All"}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      €{report.grossRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      €{report.netRevenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, reports.length)} of {reports.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

