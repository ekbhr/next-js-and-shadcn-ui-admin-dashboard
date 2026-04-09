/**
 * Admin Yahoo Report Page
 *
 * Detailed Yahoo (Advertiv) revenue data across all users.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "RevEngine Media - Yahoo Report",
};

export default async function AdminAdvertivReportPage() {
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
    prisma.bidder_Advertiv.aggregate({
      where,
      _sum: {
        grossRevenue: true,
        netRevenue: true,
        impressions: true,
        clicks: true,
      },
      _count: true,
    }),
    prisma.bidder_Advertiv.findMany({
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
        <h1 className="text-2xl font-bold">Yahoo Report</h1>
        <p className="text-muted-foreground">Detailed Yahoo feed revenue (last 31 days)</p>
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
          <CardTitle>Latest Yahoo Records</CardTitle>
          <CardDescription>Showing latest {reports.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Sub ID</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Searches</th>
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
                    <Badge variant="outline">{row.subId || "-"}</Badge>
                  </td>
                  <td className="py-2 pr-3">{row.campaignName || row.campaignId || "-"}</td>
                  <td className="py-2 pr-3">{row.countryCode || "-"}</td>
                  <td className="py-2 pr-3">{row.totalSearches.toLocaleString()}</td>
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
