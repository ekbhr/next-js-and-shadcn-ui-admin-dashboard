/**
 * Admin YHS Report Page
 *
 * Detailed YHS revenue data across all users.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncYhsButton } from "./_components/sync-yhs-button";

export const metadata: Metadata = {
  title: "RevEngine Media - YHS Report",
};

export default async function AdminYhsReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard/unauthorized");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 31);

  const where = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [summary, reports] = await Promise.all([
    prisma.bidder_YHS.aggregate({
      where,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
    }),
    prisma.bidder_YHS.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { grossRevenue: "desc" }],
      take: 200,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">YHS Report</h1>
            <p className="text-muted-foreground">Detailed YHS feed revenue (last 31 days)</p>
          </div>
          <SyncYhsButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Revenue</CardDescription>
            <CardTitle>${(summary._sum.grossRevenue || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Revenue</CardDescription>
            <CardTitle>${(summary._sum.netRevenue || 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clicks</CardDescription>
            <CardTitle>{(summary._sum.clicks || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Records</CardDescription>
            <CardTitle>{summary._count.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest YHS Records</CardTitle>
          <CardDescription>Showing latest {reports.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Link ID</th>
                <th className="py-2 pr-3">Partner</th>
                <th className="py-2 pr-3">Geo</th>
                <th className="py-2 pr-3">Monetized</th>
                <th className="py-2 pr-3">Clicks</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">User</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-3">{row.date.toISOString().split("T")[0]}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline">{row.domain || "-"}</Badge>
                  </td>
                  <td className="py-2 pr-3">{row.partnerId || "-"}</td>
                  <td className="py-2 pr-3">{row.geo || "-"}</td>
                  <td className="py-2 pr-3">{row.monetizedSearches.toLocaleString()}</td>
                  <td className="py-2 pr-3">{row.clicks.toLocaleString()}</td>
                  <td className="py-2 pr-3">${row.grossRevenue.toFixed(2)}</td>
                  <td className="py-2 pr-3">{row.user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
