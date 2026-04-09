/**
 * Advertiv (Yahoo Feed) API Client
 *
 * API docs: https://access.advertiv.com/api/stats
 * Auth: key query parameter (UUID)
 *
 * Supports multi-account via factory pattern:
 * - createAdvertivClient(credentials) for DB-stored accounts
 * - advertivClient singleton for env var fallback
 */

import axios from "axios";
import type { AdvertivCredentials } from "@/lib/encryption";

export interface AdvertivClientConfig {
  apiKey: string;
  apiUrl?: string;
}

export interface AdvertivReportParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  campaigns?: string[]; // campaign_id filters
}

export interface AdvertivRevenueData {
  date: string;
  domain?: string; // sub_id string (used for assignment mapping)
  pubId?: string;
  subId?: string;
  campaignId?: string;
  campaignName?: string;
  countryName?: string;
  countryCode?: string;
  totalSearches?: number;
  monetizedSearches?: number;
  clicks?: number;
  revenue: number;
  epc?: number;
  rpm?: number;
  monetizedCtr?: number;
  impressions?: number;
  ctr?: number;
}

export interface AdvertivReportResponse {
  success: boolean;
  data?: AdvertivRevenueData[];
  error?: string;
  totalRevenue?: number;
  totalClicks?: number;
  totalImpressions?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

type AdvertivApiRow = {
  date?: string;
  pub_id?: string | number;
  sub_id?: string | number;
  campaign_id?: string | number;
  campaign_name?: string;
  country_name?: string;
  country_code?: string;
  total_searches?: string | number;
  monetized_searches?: string | number;
  clicks?: string | number;
  revenue?: string | number;
  epc?: string | number;
  rpm?: string | number;
  monetized_ctr?: string | number;
};

class AdvertivClient {
  private apiKey?: string;
  private apiUrl: string;

  public readonly accountId?: string;
  public readonly accountName?: string;

  constructor(config?: AdvertivClientConfig & { accountId?: string; accountName?: string }) {
    if (config) {
      this.apiKey = config.apiKey;
      this.apiUrl = config.apiUrl || "https://access.advertiv.com/api/stats";
      this.accountId = config.accountId;
      this.accountName = config.accountName;
    } else {
      this.apiKey = process.env.ADVERTIV_API_KEY;
      this.apiUrl = process.env.ADVERTIV_API_URL || "https://access.advertiv.com/api/stats";
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  getConfigStatus(): { configured: boolean; hasApiKey: boolean; apiUrl: string } {
    return {
      configured: this.isConfigured(),
      hasApiKey: Boolean(this.apiKey),
      apiUrl: this.apiUrl,
    };
  }

  private normalizeNumber(value: string | number | undefined): number {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeString(value: string | number | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeDate(date?: string): string {
    if (!date) return new Date().toISOString().split("T")[0];
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  }

  private flattenResults(payload: unknown): AdvertivApiRow[] {
    if (!payload || typeof payload !== "object") return [];
    const asRecord = payload as Record<string, unknown>;
    const results = asRecord.results;
    if (!Array.isArray(results) || results.length === 0) return [];

    const first = results[0];
    if (Array.isArray(first)) {
      return first.filter((row): row is AdvertivApiRow => typeof row === "object" && row !== null);
    }

    return results.filter((row): row is AdvertivApiRow => typeof row === "object" && row !== null);
  }

  private transformRows(rows: AdvertivApiRow[]): AdvertivRevenueData[] {
    return rows.map((row) => {
      const subId = this.normalizeString(row.sub_id);
      const totalSearches = this.normalizeNumber(row.total_searches);
      const monetizedSearches = this.normalizeNumber(row.monetized_searches);
      const clicks = this.normalizeNumber(row.clicks);
      const revenue = this.normalizeNumber(row.revenue);
      const ctr =
        totalSearches > 0 ? Math.round((clicks / totalSearches) * 10000) / 100 : 0;

      return {
        date: this.normalizeDate(row.date),
        domain: subId,
        pubId: this.normalizeString(row.pub_id),
        subId,
        campaignId: this.normalizeString(row.campaign_id),
        campaignName: this.normalizeString(row.campaign_name),
        countryName: this.normalizeString(row.country_name),
        countryCode: this.normalizeString(row.country_code),
        totalSearches,
        monetizedSearches,
        clicks,
        revenue,
        epc: this.normalizeNumber(row.epc),
        rpm: this.normalizeNumber(row.rpm),
        monetizedCtr: this.normalizeNumber(row.monetized_ctr),
        impressions: totalSearches,
        ctr,
      };
    });
  }

  async getRevenueData(params: AdvertivReportParams = {}): Promise<AdvertivReportResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Advertiv API is not configured",
      };
    }

    try {
      const to = params.to || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const from =
        params.from || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const queryParams: Record<string, string> = {
        key: this.apiKey!,
        from,
        to,
        format: "json",
      };

      if (params.campaigns && params.campaigns.length > 0) {
        queryParams.campaigns = params.campaigns.join(",");
      }

      const response = await axios.get(this.apiUrl, {
        params: queryParams,
        headers: { Accept: "application/json" },
        timeout: 30000,
      });

      const payload = response.data as Record<string, unknown>;
      if (!payload?.success) {
        return {
          success: false,
          error: typeof payload?.error === "string" ? payload.error : "Advertiv API returned failure",
        };
      }

      const rows = this.flattenResults(payload);
      const data = this.transformRows(rows);
      const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
      const totalClicks = data.reduce((sum, row) => sum + (row.clicks || 0), 0);
      const totalImpressions = data.reduce((sum, row) => sum + (row.impressions || 0), 0);

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
        error: error instanceof Error ? error.message : "Unknown Advertiv API error",
      };
    }
  }

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
      const key = row.subId?.trim();
      if (!key) continue;
      const existing = grouped.get(key);
      if (existing) {
        existing.revenue += row.revenue;
        existing.clicks += row.clicks || 0;
        existing.impressions += row.impressions || 0;
      } else {
        grouped.set(key, {
          domain: key,
          revenue: row.revenue,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
        });
      }
    }

    return {
      success: true,
      domains: Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }
}

export function createAdvertivClient(
  credentials: AdvertivCredentials,
  options?: { accountId?: string; accountName?: string }
): AdvertivClient {
  return new AdvertivClient({
    apiKey: credentials.apiKey,
    accountId: options?.accountId,
    accountName: options?.accountName,
  });
}

export const advertivClient = new AdvertivClient();
export { AdvertivClient };
