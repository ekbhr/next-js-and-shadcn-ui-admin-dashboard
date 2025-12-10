"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, Download, Settings2, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

interface SedoReport {
  id: string;
  date: Date;
  domain: string;
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

interface DomainTotal {
  domain: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
  recordCount: number;
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

interface SedoReportTableProps {
  reports: SedoReport[];
  domainTotals: DomainTotal[];
  userTotals: UserTotal[];
}

// Reusable DataTable component
function DataTable<T>({
  data,
  columns,
  searchPlaceholder,
  exportFilename,
  exportColumns,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  exportFilename: string;
  exportColumns: { key: keyof T; header: string }[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: "includesString",
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const handleExport = () => {
    const filteredData = table.getFilteredRowModel().rows.map((row) => row.original);
    exportToCSV(filteredData, exportColumns, exportFilename);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns()
                .filter((col) => col.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sortable header helper
function SortableHeader<T>({ column, label }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; label: string }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-4"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function SedoReportTable({ reports, domainTotals, userTotals }: SedoReportTableProps) {
  // Domain columns
  const domainColumns: ColumnDef<DomainTotal>[] = useMemo(() => [
    {
      accessorKey: "domain",
      header: ({ column }) => <SortableHeader column={column} label="Domain" />,
    },
    {
      accessorKey: "grossRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Gross Revenue" />,
      cell: ({ row }) => `€${row.original.grossRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "netRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Net Revenue" />,
      cell: ({ row }) => `€${row.original.netRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "impressions",
      header: ({ column }) => <SortableHeader column={column} label="Impressions" />,
      cell: ({ row }) => row.original.impressions.toLocaleString(),
    },
    {
      accessorKey: "clicks",
      header: ({ column }) => <SortableHeader column={column} label="Clicks" />,
      cell: ({ row }) => row.original.clicks.toLocaleString(),
    },
    {
      id: "ctr",
      header: "CTR",
      cell: ({ row }) => {
        const ctr = row.original.impressions > 0 
          ? (row.original.clicks / row.original.impressions) * 100 
          : 0;
        return `${ctr.toFixed(2)}%`;
      },
    },
    {
      id: "rpm",
      header: "RPM",
      cell: ({ row }) => {
        const rpm = row.original.impressions > 0 
          ? (row.original.grossRevenue / row.original.impressions) * 1000 
          : 0;
        return `€${rpm.toFixed(2)}`;
      },
    },
  ], []);

  // User columns
  const userColumns: ColumnDef<UserTotal>[] = useMemo(() => [
    {
      accessorKey: "userName",
      header: ({ column }) => <SortableHeader column={column} label="User" />,
      cell: ({ row }) => row.original.userName || row.original.userEmail,
    },
    {
      accessorKey: "userEmail",
      header: "Email",
    },
    {
      accessorKey: "grossRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Gross Revenue" />,
      cell: ({ row }) => `€${row.original.grossRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "netRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Net Revenue" />,
      cell: ({ row }) => `€${row.original.netRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "impressions",
      header: ({ column }) => <SortableHeader column={column} label="Impressions" />,
      cell: ({ row }) => row.original.impressions.toLocaleString(),
    },
    {
      accessorKey: "clicks",
      header: ({ column }) => <SortableHeader column={column} label="Clicks" />,
      cell: ({ row }) => row.original.clicks.toLocaleString(),
    },
  ], []);

  // All records columns
  const recordColumns: ColumnDef<SedoReport>[] = useMemo(() => [
    {
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column} label="Date" />,
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "domain",
      header: ({ column }) => <SortableHeader column={column} label="Domain" />,
    },
    {
      accessorKey: "userName",
      header: "User",
      cell: ({ row }) => row.original.userName || row.original.userEmail.split("@")[0],
    },
    {
      accessorKey: "grossRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Gross" />,
      cell: ({ row }) => `€${row.original.grossRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "netRevenue",
      header: ({ column }) => <SortableHeader column={column} label="Net" />,
      cell: ({ row }) => `€${row.original.netRevenue.toFixed(2)}`,
    },
    {
      accessorKey: "impressions",
      header: ({ column }) => <SortableHeader column={column} label="Imp" />,
      cell: ({ row }) => row.original.impressions.toLocaleString(),
    },
    {
      accessorKey: "clicks",
      header: ({ column }) => <SortableHeader column={column} label="Clicks" />,
    },
    {
      accessorKey: "ctr",
      header: "CTR",
      cell: ({ row }) => `${(row.original.ctr ?? 0).toFixed(2)}%`,
    },
  ], []);

  // Export column definitions
  const domainExportColumns: { key: keyof DomainTotal; header: string }[] = [
    { key: "domain", header: "Domain" },
    { key: "grossRevenue", header: "Gross Revenue (EUR)" },
    { key: "netRevenue", header: "Net Revenue (EUR)" },
    { key: "impressions", header: "Impressions" },
    { key: "clicks", header: "Clicks" },
  ];

  const userExportColumns: { key: keyof UserTotal; header: string }[] = [
    { key: "userName", header: "User Name" },
    { key: "userEmail", header: "Email" },
    { key: "grossRevenue", header: "Gross Revenue (EUR)" },
    { key: "netRevenue", header: "Net Revenue (EUR)" },
    { key: "impressions", header: "Impressions" },
    { key: "clicks", header: "Clicks" },
  ];

  const recordExportColumns: { key: keyof SedoReport; header: string }[] = [
    { key: "date", header: "Date" },
    { key: "domain", header: "Domain" },
    { key: "userName", header: "User" },
    { key: "grossRevenue", header: "Gross Revenue (EUR)" },
    { key: "netRevenue", header: "Net Revenue (EUR)" },
    { key: "impressions", header: "Impressions" },
    { key: "clicks", header: "Clicks" },
    { key: "ctr", header: "CTR (%)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sedo Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="domains" className="space-y-4">
          <TabsList>
            <TabsTrigger value="domains">By Domain ({domainTotals.length})</TabsTrigger>
            <TabsTrigger value="users">By User ({userTotals.length})</TabsTrigger>
            <TabsTrigger value="records">All Records ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="domains">
            <DataTable
              data={domainTotals}
              columns={domainColumns}
              searchPlaceholder="Search domains..."
              exportFilename="sedo-domains"
              exportColumns={domainExportColumns}
            />
          </TabsContent>

          <TabsContent value="users">
            <DataTable
              data={userTotals}
              columns={userColumns}
              searchPlaceholder="Search users..."
              exportFilename="sedo-users"
              exportColumns={userExportColumns}
            />
          </TabsContent>

          <TabsContent value="records">
            <DataTable
              data={reports}
              columns={recordColumns}
              searchPlaceholder="Search records..."
              exportFilename="sedo-records"
              exportColumns={recordExportColumns}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

