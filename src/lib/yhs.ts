/**
 * YHS (Searchfor.live) API Client
 *
 * Reporting URL format (per provider):
 *   https://a.searchfor.live/report/<APIKEY>?start=<YYYY-MM-DD>&end=<YYYY-MM-DD>
 *
 * Response shape:
 *   { report: Array<{
 *       date, partner_id, linkid, geo,
 *       initial_searches, feed_searches, monetized_searches,
 *       clicks, revenue, coverage, cpc, ctr, tq
 *   }> }
 */

import axios from "axios";

import type { YhsCredentials } from "@/lib/encryption";

export interface YhsClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface YhsReportParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface YhsRevenueData {
  date: string; // YYYY-MM-DD
  partnerId?: number;
  domain?: string; // linkid as string (we use it as "domain" key in app)
  geo?: string;

  initialSearches?: number;
  feedSearches?: number;
  monetizedSearches?: number;

  clicks?: number;
  revenue?: number;

  coverage?: number | null;
  cpc?: number | null;
  ctr?: number | null;
  tq?: number | null;
}

export interface YhsReportResponse {
  success: boolean;
  data?: YhsRevenueData[];
  error?: string;
  totalRevenue?: number;
  totalClicks?: number;
  totalImpressions?: number;
  dateRange?: { start: string; end: string };
}

type YhsApiRow = {
  date?: string;
  partner_id?: number;
  linkid?: number;
  geo?: string;
  initial_searches?: number | string;
  feed_searches?: number | string;
  monetized_searches?: number | string;
  clicks?: number | string;
  revenue?: number | string;
  coverage?: number | null;
  cpc?: number | null;
  ctr?: number | null;
  tq?: number | null;
};

class YhsClient {
  private apiKey?: string;
  private baseUrl: string;

  public readonly accountId?: string;
  public readonly accountName?: string;

  constructor(config?: YhsClientConfig & { accountId?: string; accountName?: string }) {
    if (config) {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || "https://a.searchfor.live/report";
      this.accountId = config.accountId;
      this.accountName = config.accountName;
    } else {
      this.apiKey = process.env.YHS_API_KEY;
      this.baseUrl = "https://a.searchfor.live/report";
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  getConfigStatus(): { configured: boolean; hasApiKey: boolean; baseUrl: string } {
    return {
      configured: this.isConfigured(),
      hasApiKey: Boolean(this.apiKey),
      baseUrl: this.baseUrl,
    };
  }

  private normalizeDate(date?: string): string {
    if (!date) return new Date().toISOString().split("T")[0];
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private flattenPayload(payload: unknown): YhsApiRow[] {
    if (!payload || typeof payload !== "object") return [];
    const asRecord = payload as Record<string, unknown>;
    const report = asRecord.report;
    if (!Array.isArray(report)) return [];
    return report.filter((r): r is YhsApiRow => typeof r === "object" && r !== null) as YhsApiRow[];
  }

  private transformRows(rows: YhsApiRow[]): YhsRevenueData[] {
    return rows.map((row) => {
      const date = this.normalizeDate(row.date);
      const domain = row.linkid !== undefined && row.linkid !== null ? String(row.linkid) : undefined;

      return {
        date,
        partnerId: row.partner_id ?? undefined,
        domain,
        geo: row.geo ?? undefined,
        initialSearches: this.normalizeNumber(row.initial_searches) ?? undefined,
        feedSearches: this.normalizeNumber(row.feed_searches) ?? undefined,
        monetizedSearches: this.normalizeNumber(row.monetized_searches) ?? undefined,
        clicks: this.normalizeNumber(row.clicks) ?? undefined,
        revenue: this.normalizeNumber(row.revenue) ?? undefined,
        coverage: this.normalizeNumber(row.coverage) ?? null,
        cpc: this.normalizeNumber(row.cpc) ?? null,
        ctr: this.normalizeNumber(row.ctr) ?? null,
        tq: this.normalizeNumber(row.tq) ?? null,
      };
    });
  }

  async getRevenueData(params: YhsReportParams = {}): Promise<YhsReportResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: "YHS API is not configured" };
    }

    try {
      const to = params.to || new Date().toISOString().split("T")[0];
      const from =
        params.from ||
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const url = `${this.baseUrl}/${this.apiKey}`;

      const response = await axios.get(url, {
        params: { start: from, end: to },
        headers: { Accept: "application/json" },
        timeout: 30000,
      });

      const payload = response.data as unknown;
      const rows = this.flattenPayload(payload);
      const data = this.transformRows(rows);

      const totalRevenue = data.reduce((sum, r) => sum + (r.revenue ?? 0), 0);
      const totalClicks = data.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
      const totalImpressions = data.reduce(
        (sum, r) => sum + (r.monetizedSearches ?? 0),
        0,
      );

      return {
        success: true,
        data,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalClicks,
        totalImpressions,
        dateRange: { start: from, end: to },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const apiError =
          (error.response?.data as { error?: string } | undefined)?.error || error.message;
        return {
          success: false,
          error: status ? `HTTP ${status}: ${apiError}` : apiError,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown YHS API error",
      };
    }
  }

  /**
   * Build "domains" list for Domain_Assignment table.
   * We treat `linkid` as the app-domain key.
   */
  async getDomains(): Promise<{
    success: boolean;
    domains: Array<{ domain: string; revenue: number; clicks: number; impressions: number }>;
    error?: string;
  }> {
    const report = await this.getRevenueData();
    if (!report.success || !report.data) {
      return { success: false, domains: [], error: report.error };
    }

    const grouped = new Map<string, { domain: string; revenue: number; clicks: number; impressions: number }>();
    for (const row of report.data) {
      const key = row.domain?.trim();
      if (!key) continue;

      const existing = grouped.get(key);
      if (existing) {
        existing.revenue += row.revenue ?? 0;
        existing.clicks += row.clicks ?? 0;
        existing.impressions += row.monetizedSearches ?? 0;
      } else {
        grouped.set(key, {
          domain: key,
          revenue: row.revenue ?? 0,
          clicks: row.clicks ?? 0,
          impressions: row.monetizedSearches ?? 0,
        });
      }
    }

    return {
      success: true,
      domains: Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }
}

export function createYhsClient(
  credentials: YhsCredentials,
  options?: { accountId?: string; accountName?: string },
): YhsClient {
  return new YhsClient({
    apiKey: credentials.apiKey,
    accountId: options?.accountId,
    accountName: options?.accountName,
  });
}

export const yhsClient = new YhsClient();
export { YhsClient };

