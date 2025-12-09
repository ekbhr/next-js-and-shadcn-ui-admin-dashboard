/**
 * Sedo Data Processor
 * 
 * This utility processes raw Sedo API data and transforms it into
 * a format ready for database storage.
 * 
 * Workflow:
 * 1. Pull data from Sedo API (via sedo.ts)
 * 2. Process/transform data (this file)
 * 3. Save to database (will be implemented later)
 */

import type { SedoRevenueData, SedoReportResponse } from "./sedo";

/**
 * Processed data structure ready for database storage
 * This will match the Prisma schema once models are defined
 */
export interface ProcessedSedoData {
  // Core identifiers
  date: Date;
  domain?: string;
  network: "sedo"; // Always "sedo" for Sedo data
  
  // Revenue metrics
  grossRevenue?: number; // Total revenue before revshare
  netRevenue?: number; // Revenue after revshare
  revshare?: number; // Revshare percentage (0-100)
  
  // Performance metrics
  clicks?: number;
  impressions?: number;
  ctr?: number; // Click-through rate percentage
  rpm?: number; // Revenue per mille
  
  // Breakdowns
  geo?: string; // Country code (e.g., "US", "GB")
  device?: string; // Device type (e.g., "desktop", "mobile", "tablet")
  
  // Metadata
  userId?: string; // Will be added when saving to database
  source: "api" | "csv" | "manual"; // How the data was obtained
  processedAt: Date; // When this data was processed
}

/**
 * Process raw Sedo API response into database-ready format
 */
export function processSedoRevenueData(
  rawData: SedoRevenueData[],
  options: {
    userId?: string;
    revshare?: number; // Revshare percentage (0-100)
    source?: "api" | "csv" | "manual";
  } = {}
): ProcessedSedoData[] {
  const processedAt = new Date();
  const { userId, revshare = 0, source = "api" } = options;

  return rawData.map((item) => {
    // Calculate net revenue if revshare is provided
    const grossRevenue = item.revenue;
    const netRevenue = revshare > 0 
      ? grossRevenue * (1 - revshare / 100)
      : grossRevenue;

    return {
      date: new Date(item.date),
      domain: item.domain,
      network: "sedo" as const,
      
      grossRevenue: grossRevenue ? Math.round(grossRevenue * 100) / 100 : undefined,
      netRevenue: netRevenue ? Math.round(netRevenue * 100) / 100 : undefined,
      revshare: revshare > 0 ? Math.round(revshare * 100) / 100 : undefined,
      
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.ctr ? Math.round(item.ctr * 100) / 100 : undefined,
      rpm: item.rpm ? Math.round(item.rpm * 100) / 100 : undefined,
      
      geo: item.geo,
      device: item.device,
      
      userId,
      source,
      processedAt,
    };
  });
}

/**
 * Process Sedo report response and return processed data
 */
export function processSedoReport(
  report: SedoReportResponse,
  options: {
    userId?: string;
    revshare?: number;
    source?: "api" | "csv" | "manual";
  } = {}
): {
  success: boolean;
  processed?: ProcessedSedoData[];
  error?: string;
  metadata?: {
    totalRevenue: number;
    totalClicks: number;
    totalImpressions: number;
    dateRange?: { start: string; end: string };
  };
} {
  if (!report.success || !report.data) {
    return {
      success: false,
      error: report.error || "No data available",
    };
  }

  const processed = processSedoRevenueData(report.data, options);

  return {
    success: true,
    processed,
    metadata: {
      totalRevenue: report.totalRevenue || 0,
      totalClicks: report.totalClicks || 0,
      totalImpressions: report.totalImpressions || 0,
      dateRange: report.dateRange,
    },
  };
}

/**
 * Validate processed data before saving to database
 */
export function validateProcessedData(data: ProcessedSedoData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.date || isNaN(data.date.getTime())) {
    errors.push("Invalid date");
  }

  if (data.grossRevenue !== undefined && data.grossRevenue < 0) {
    errors.push("Gross revenue cannot be negative");
  }

  if (data.netRevenue !== undefined && data.netRevenue < 0) {
    errors.push("Net revenue cannot be negative");
  }

  if (data.revshare !== undefined && (data.revshare < 0 || data.revshare > 100)) {
    errors.push("Revshare must be between 0 and 100");
  }

  if (data.clicks !== undefined && data.clicks < 0) {
    errors.push("Clicks cannot be negative");
  }

  if (data.impressions !== undefined && data.impressions < 0) {
    errors.push("Impressions cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validate multiple processed data items
 */
export function validateBatch(data: ProcessedSedoData[]): {
  valid: boolean;
  validItems: ProcessedSedoData[];
  invalidItems: Array<{ data: ProcessedSedoData; errors: string[] }>;
} {
  const validItems: ProcessedSedoData[] = [];
  const invalidItems: Array<{ data: ProcessedSedoData; errors: string[] }> = [];

  for (const item of data) {
    const validation = validateProcessedData(item);
    if (validation.valid) {
      validItems.push(item);
    } else {
      invalidItems.push({ data: item, errors: validation.errors });
    }
  }

  return {
    valid: invalidItems.length === 0,
    validItems,
    invalidItems,
  };
}

