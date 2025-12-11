/**
 * Yandex Advertising Network (YAN) API Client
 *
 * This service handles fetching data from Yandex Partner Statistics API
 * API Documentation: https://yandex.ru/dev/partner-statistics/doc/en/
 *
 * Authentication: OAuth token
 */

import axios from "axios";

export interface YandexReportParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  domain?: string;
}

export interface YandexRevenueData {
  date: string;
  domain?: string;
  tagId?: string;
  tagName?: string;
  revenue: number; // partner_wo_nds (revenue without VAT)
  impressions?: number; // shows
  clicks?: number;
  ctr?: number;
  rpm?: number;
}

export interface YandexReportResponse {
  success: boolean;
  data?: YandexRevenueData[];
  error?: string;
  totalRevenue?: number;
  totalClicks?: number;
  totalImpressions?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

class YandexClient {
  private apiToken?: string;
  private apiUrl: string;

  constructor() {
    this.apiToken = process.env.YANDEX_API;
    this.apiUrl = "https://partner2.yandex.ru/api/statistics2/get.json";
  }

  /**
   * Check if Yandex API is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): {
    configured: boolean;
    hasToken: boolean;
    apiUrl: string;
  } {
    return {
      configured: this.isConfigured(),
      hasToken: !!this.apiToken,
      apiUrl: this.apiUrl,
    };
  }

  /**
   * Make authenticated request to Yandex API
   * 
   * Yandex Partner API supports OAuth token via:
   * 1. Authorization header: "OAuth <token>"
   * 2. Query parameter: oauth_token=<token>
   * 
   * We try both methods for compatibility.
   */
  private async makeApiRequest(
    params: Record<string, string | number | string[]>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      console.log("[Yandex API] Making request to:", this.apiUrl);
      console.log("[Yandex API] Params:", JSON.stringify(params, null, 2));

      const response = await axios.get(this.apiUrl, {
        params: {
          ...params,
          oauth_token: this.apiToken, // Query param method
          lang: "en",
        },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${this.apiToken}`, // Header method
        },
        timeout: 60000,
      });

      console.log("[Yandex API] Response status:", response.status);
      console.log("[Yandex API] Response data preview:", JSON.stringify(response.data).substring(0, 500));

      if (response.data?.error) {
        console.error("[Yandex API] Error in response:", response.data.error);
        return {
          success: false,
          error: response.data.error.message || response.data.error,
        };
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[Yandex API] Request error:", error.message);
        if (error.response) {
          console.error("[Yandex API] Response status:", error.response.status);
          console.error("[Yandex API] Response data:", JSON.stringify(error.response.data));
        }
        return {
          success: false,
          error: error.response?.data?.error?.message || error.response?.data?.message || error.message,
        };
      }
      console.error("[Yandex API] Unknown error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Transform Yandex API response to our standard format
   */
  private transformToRevenueData(
    data: Record<string, unknown>
  ): YandexRevenueData[] {
    const results: YandexRevenueData[] = [];

    // Yandex API returns data in a specific structure
    // The response typically has a "data" array with rows
    const rows = (data.data as Array<Record<string, unknown>>) || [];

    for (const row of rows) {
      // Extract dimensions
      const dimensions = row.dimensions as Record<string, unknown> || {};
      const date = (dimensions.date as string) || "";
      const domain = (dimensions.domain as string) || undefined;
      const tagId = (dimensions.tag_id as string) || undefined;
      const tagName = (dimensions.tag_name as string) || undefined;

      // Extract metrics
      const metrics = row.metrics as Record<string, number> || {};
      const impressions = metrics.shows || metrics.hits || 0;
      const clicks = metrics.clicks || 0;
      const revenue = metrics.partner_wo_nds || metrics.money || 0;

      // Calculate derived metrics
      const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
      const rpm = impressions > 0 ? Math.round((revenue / impressions) * 1000 * 100) / 100 : 0;

      results.push({
        date,
        domain,
        tagId,
        tagName,
        revenue,
        impressions,
        clicks,
        ctr,
        rpm,
      });
    }

    return results;
  }

  /**
   * Fetch revenue data from Yandex
   */
  async getRevenueData(
    params: YandexReportParams = {}
  ): Promise<YandexReportResponse> {
    if (!this.isConfigured()) {
      console.warn("[Yandex API] Not configured, returning mock data");
      return this.getMockData(params);
    }

    try {
      // Calculate date range (default: last 31 days)
      const endDate = params.endDate || new Date().toISOString().split("T")[0];
      const startDate = params.startDate || 
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      console.log(`[Yandex API] Fetching data from ${startDate} to ${endDate}`);

      // Build API request
      // Yandex API uses specific parameter format
      const requestParams: Record<string, string | number | string[]> = {
        date1: startDate,
        date2: endDate,
        group: "day", // Group by day
        dimensions: "date,domain,tag_id,tag_name",
        metrics: "shows,clicks,partner_wo_nds",
        currency: "usd", // Use USD as requested
        pretty: 0,
      };

      const result = await this.makeApiRequest(requestParams);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || "Failed to fetch Yandex data",
        };
      }

      const data = this.transformToRevenueData(result.data);

      if (data.length === 0) {
        console.warn("[Yandex API] No data returned");
        return {
          success: true,
          data: [],
          totalRevenue: 0,
          totalClicks: 0,
          totalImpressions: 0,
          dateRange: { start: startDate, end: endDate },
        };
      }

      // Sort by date
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate totals
      const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
      const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);

      return {
        success: true,
        data,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalClicks,
        totalImpressions,
        dateRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error("[Yandex API] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Yandex data",
      };
    }
  }

  /**
   * Fetch list of domains from Yandex
   */
  async getDomains(): Promise<{
    success: boolean;
    domains: Array<{
      domain: string;
      revenue: number;
      impressions: number;
      clicks: number;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, domains: [], error: "API not configured" };
    }

    try {
      // Get last 31 days grouped by domain
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const requestParams: Record<string, string | number | string[]> = {
        date1: startDate,
        date2: endDate,
        group: "all", // Aggregate all
        dimensions: "domain",
        metrics: "shows,clicks,partner_wo_nds",
        currency: "usd",
        pretty: 0,
      };

      const result = await this.makeApiRequest(requestParams);

      if (!result.success || !result.data) {
        return { success: false, domains: [], error: result.error };
      }

      const rows = (result.data.data as Array<Record<string, unknown>>) || [];
      const domains: Array<{
        domain: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }> = [];

      for (const row of rows) {
        const dimensions = row.dimensions as Record<string, unknown> || {};
        const metrics = row.metrics as Record<string, number> || {};
        
        const domain = (dimensions.domain as string) || "";
        if (!domain) continue;

        domains.push({
          domain,
          revenue: metrics.partner_wo_nds || 0,
          impressions: metrics.shows || 0,
          clicks: metrics.clicks || 0,
        });
      }

      // Sort by revenue descending
      domains.sort((a, b) => b.revenue - a.revenue);

      console.log(`[Yandex API] Found ${domains.length} domains`);
      return { success: true, domains };
    } catch (error) {
      console.error("[Yandex API] Error fetching domains:", error);
      return {
        success: false,
        domains: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch list of tags/adunits from Yandex
   */
  async getTags(): Promise<{
    success: boolean;
    tags: Array<{
      tagId: string;
      tagName: string;
      domain?: string;
      revenue: number;
      impressions: number;
      clicks: number;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, tags: [], error: "API not configured" };
    }

    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const requestParams: Record<string, string | number | string[]> = {
        date1: startDate,
        date2: endDate,
        group: "all",
        dimensions: "tag_id,tag_name,domain",
        metrics: "shows,clicks,partner_wo_nds",
        currency: "usd",
        pretty: 0,
      };

      const result = await this.makeApiRequest(requestParams);

      if (!result.success || !result.data) {
        return { success: false, tags: [], error: result.error };
      }

      const rows = (result.data.data as Array<Record<string, unknown>>) || [];
      const tags: Array<{
        tagId: string;
        tagName: string;
        domain?: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }> = [];

      for (const row of rows) {
        const dimensions = row.dimensions as Record<string, unknown> || {};
        const metrics = row.metrics as Record<string, number> || {};
        
        const tagId = (dimensions.tag_id as string) || "";
        if (!tagId) continue;

        tags.push({
          tagId,
          tagName: (dimensions.tag_name as string) || tagId,
          domain: (dimensions.domain as string) || undefined,
          revenue: metrics.partner_wo_nds || 0,
          impressions: metrics.shows || 0,
          clicks: metrics.clicks || 0,
        });
      }

      // Sort by revenue descending
      tags.sort((a, b) => b.revenue - a.revenue);

      console.log(`[Yandex API] Found ${tags.length} tags`);
      return { success: true, tags };
    } catch (error) {
      console.error("[Yandex API] Error fetching tags:", error);
      return {
        success: false,
        tags: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mock data for development/testing
   */
  private getMockData(params: YandexReportParams): YandexReportResponse {
    const startDate = params.startDate ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = params.endDate || new Date().toISOString().split("T")[0];

    const mockDomains = ["example.com", "test-domain.net", "sample-site.org"];
    const mockTags = ["tag-001", "tag-002", "tag-003"];

    const data: YandexRevenueData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      
      for (const domain of mockDomains) {
        for (const tagId of mockTags) {
          const revenue = Math.random() * 2 + 0.1;
          const impressions = Math.floor(Math.random() * 200 + 50);
          const clicks = Math.floor(Math.random() * 10);

          data.push({
            date: dateStr,
            domain,
            tagId,
            tagName: `Tag ${tagId.split("-")[1]}`,
            revenue: Math.round(revenue * 100) / 100,
            impressions,
            clicks,
            ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
            rpm: impressions > 0 ? Math.round((revenue / impressions) * 1000 * 100) / 100 : 0,
          });
        }
      }
    }

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);

    return {
      success: true,
      data,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClicks,
      totalImpressions,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

// Export singleton instance
export const yandexClient = new YandexClient();

