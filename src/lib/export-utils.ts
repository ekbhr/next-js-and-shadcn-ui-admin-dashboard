/**
 * Export Utilities
 * 
 * Functions for exporting data to CSV and other formats.
 */

/**
 * Convert data array to CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return "";

  // Header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        // Handle different types
        if (value === null || value === undefined) return '""';
        if (typeof value === "number") return value.toString();
        if (value instanceof Date) return `"${value.toISOString().split("T")[0]}"`;
        // Escape quotes in strings
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
): void {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: number, currency = "EUR"): string {
  return `${currency} ${value.toFixed(2)}`;
}

