"use client";

import { useState, useMemo } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  FileText,
  Download,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

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

// User Totals Table Columns
const userColumns: ColumnDef<UserTotal>[] = [
  {
    accessorKey: "userName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        User
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.userName || "No name"}</p>
        <p className="text-sm text-muted-foreground">{row.original.userEmail}</p>
      </div>
    ),
  },
  {
    accessorKey: "domainCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Domains
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right">{row.original.domainCount}</div>,
  },
  {
    accessorKey: "impressions",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Impressions
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.impressions.toLocaleString()}</div>
    ),
  },
  {
    accessorKey: "clicks",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Clicks
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.clicks.toLocaleString()}</div>
    ),
  },
  {
    accessorKey: "grossRevenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Gross Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-blue-600">
        €{row.original.grossRevenue.toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "netRevenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Net Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-green-600">
        €{row.original.netRevenue.toFixed(2)}
      </div>
    ),
  },
];

// Detailed Records Table Columns
const reportColumns: ColumnDef<Report>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {new Date(row.original.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    accessorKey: "userName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        User
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.userName || row.original.userEmail}</span>
    ),
    filterFn: (row, id, value) => {
      const userName = row.original.userName || row.original.userEmail;
      return userName.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "network",
    header: "Network",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.network === "sedo"
            ? "bg-blue-500"
            : row.original.network === "google"
            ? "bg-green-500"
            : "bg-gray-500"
        }
      >
        {row.original.network.toUpperCase()}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      return row.original.network.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Domain
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-[150px] truncate">{row.original.domain || "All"}</div>
    ),
    filterFn: (row, id, value) => {
      const domain = row.original.domain || "All";
      return domain.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "impressions",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Impressions
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.impressions.toLocaleString()}</div>
    ),
  },
  {
    accessorKey: "clicks",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Clicks
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.clicks.toLocaleString()}</div>
    ),
  },
  {
    accessorKey: "grossRevenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Gross
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-blue-600">
        €{row.original.grossRevenue.toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "netRevenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Net
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-green-600">
        €{row.original.netRevenue.toFixed(2)}
      </div>
    ),
  },
];

export function AdminReportTable({ reports, userTotals }: AdminReportTableProps) {
  // User table state
  const [userSorting, setUserSorting] = useState<SortingState>([]);
  const [userColumnVisibility, setUserColumnVisibility] = useState<VisibilityState>({});

  // Report table state
  const [reportSorting, setReportSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [reportFilters, setReportFilters] = useState<ColumnFiltersState>([]);
  const [reportColumnVisibility, setReportColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // User totals table
  const userTable = useReactTable({
    data: userTotals,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setUserSorting,
    onColumnVisibilityChange: setUserColumnVisibility,
    state: {
      sorting: userSorting,
      columnVisibility: userColumnVisibility,
    },
  });

  // Reports table
  const reportTable = useReactTable({
    data: reports,
    columns: reportColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setReportSorting,
    onColumnFiltersChange: setReportFilters,
    onColumnVisibilityChange: setReportColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting: reportSorting,
      columnFilters: reportFilters,
      columnVisibility: reportColumnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Export functions
  const exportUserTotals = () => {
    exportToCSV(
      userTotals,
      [
        { key: "userName", header: "Name" },
        { key: "userEmail", header: "Email" },
        { key: "domainCount", header: "Domains" },
        { key: "impressions", header: "Impressions" },
        { key: "clicks", header: "Clicks" },
        { key: "grossRevenue", header: "Gross Revenue (EUR)" },
        { key: "netRevenue", header: "Net Revenue (EUR)" },
      ],
      `revenue-by-user-${new Date().toISOString().split("T")[0]}`
    );
  };

  const exportReports = () => {
    // Export filtered data
    const filteredData = reportTable.getFilteredRowModel().rows.map((row) => ({
      ...row.original,
      date: new Date(row.original.date).toISOString().split("T")[0],
    }));

    exportToCSV(
      filteredData,
      [
        { key: "date", header: "Date" },
        { key: "userName", header: "User" },
        { key: "userEmail", header: "Email" },
        { key: "network", header: "Network" },
        { key: "domain", header: "Domain" },
        { key: "impressions", header: "Impressions" },
        { key: "clicks", header: "Clicks" },
        { key: "grossRevenue", header: "Gross Revenue (EUR)" },
        { key: "netRevenue", header: "Net Revenue (EUR)" },
      ],
      `revenue-details-${new Date().toISOString().split("T")[0]}`
    );
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue by User</CardTitle>
              <CardDescription>Aggregated totals for each user</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {userTable
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={exportUserTotals}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                {userTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {userTable.getRowModel().rows.length ? (
                  userTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={userColumns.length} className="h-24 text-center">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detailed Revenue Records ({reportTable.getFilteredRowModel().rows.length})</CardTitle>
              <CardDescription>Individual revenue records from all users</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {reportTable
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={exportReports}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search/Filter */}
            <div className="flex items-center py-4 gap-4">
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm"
              />
              <Input
                placeholder="Filter by domain..."
                value={(reportTable.getColumn("domain")?.getFilterValue() as string) ?? ""}
                onChange={(e) => reportTable.getColumn("domain")?.setFilterValue(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {reportTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {reportTable.getRowModel().rows.length ? (
                    reportTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={reportColumns.length} className="h-24 text-center">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                Showing {reportTable.getState().pagination.pageIndex * reportTable.getState().pagination.pageSize + 1}-
                {Math.min(
                  (reportTable.getState().pagination.pageIndex + 1) * reportTable.getState().pagination.pageSize,
                  reportTable.getFilteredRowModel().rows.length
                )}{" "}
                of {reportTable.getFilteredRowModel().rows.length} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportTable.setPageIndex(0)}
                  disabled={!reportTable.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportTable.previousPage()}
                  disabled={!reportTable.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {reportTable.getState().pagination.pageIndex + 1} of {reportTable.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportTable.nextPage()}
                  disabled={!reportTable.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportTable.setPageIndex(reportTable.getPageCount() - 1)}
                  disabled={!reportTable.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
