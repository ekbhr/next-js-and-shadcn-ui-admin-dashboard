/**
 * Yandex Advertising Network (YAN) API Client
 *
 * This service handles fetching data from Yandex Partner Statistics API
 * API Documentation: https://yandex.ru/dev/partner-statistics/doc/en/
 *
 * Authentication: OAuth token
 * 
 * Supports multi-account via factory pattern:
 * - createYandexClient(credentials) - creates client with specific credentials
 * - yandexClient - singleton using env vars (backward compatible)
 */

import axios from "axios";
import type { YandexCredentials } from "@/lib/encryption";

// ============================================
// Types
// ============================================

export interface YandexClientConfig {
  oauthToken: string;
  apiUrl?: string;
}

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
  
  // Multi-account support
  public readonly accountId?: string;
  public readonly accountName?: string;

  /**
   * Create a Yandex client.
   * @param config - Optional config. If not provided, uses environment variables.
   */
  constructor(config?: YandexClientConfig & { accountId?: string; accountName?: string }) {
    if (config) {
      // Use provided config (multi-account mode)
      this.apiToken = config.oauthToken;
      this.apiUrl = config.apiUrl || "https://partner.yandex.ru/api/statistics2/get.json";
      this.accountId = config.accountId;
      this.accountName = config.accountName;
    } else {
      // Fall back to environment variables (backward compatible)
      this.apiToken = process.env.YANDEX_API;
      this.apiUrl = "https://partner.yandex.ru/api/statistics2/get.json";
    }
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
   * API Docs: https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
   * Authentication: Authorization header with "OAuth <token>"
   * 
   * Array parameters (like period, field) are serialized correctly by axios.paramsSerializer
   */
  private async makeApiRequest(
    params: Record<string, string | number | string[]>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      console.log("[Yandex API] Making request to:", this.apiUrl);
      console.log("[Yandex API] Params:", JSON.stringify(params, null, 2));

      const response = await axios.get(this.apiUrl, {
        params,
        // Serialize arrays as repeated params: field=a&field=b (not field[]=a)
        paramsSerializer: {
          indexes: null, // This makes arrays serialize as key=val1&key=val2
        },
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${this.apiToken}`,
        },
        timeout: 60000,
      });

      console.log("[Yandex API] Response status:", response.status);
      console.log("[Yandex API] Response data preview:", JSON.stringify(response.data).substring(0, 500));

      // Check for Yandex error response
      if (response.data?.result === "error") {
        console.error("[Yandex API] Error in response:", response.data);
        return {
          success: false,
          error: response.data.error?.message || response.data.error || "API returned error",
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
   * 
   * Response format (per docs):
   * {
   *   "result": "ok",
   *   "data": {
   *     "points": [
   *       {
   *         "dimensions": { "date": ["2024-12-01"], "domain": "example.com" },
   *         "measures": [{ "shows": 100, "clicks": 5, "partner_wo_nds": 1.50 }]
   *       }
   *     ],
   *     "totals": { ... }
   *   }
   * }
   */
  private transformToRevenueData(
    responseData: Record<string, unknown>
  ): YandexRevenueData[] {
    const results: YandexRevenueData[] = [];

    // Navigate to the correct data structure
    const data = responseData.data as Record<string, unknown> | undefined;
    if (!data) {
      console.warn("[Yandex API] No 'data' field in response");
      return results;
    }

    // Get points array
    const points = (data.points as Array<Record<string, unknown>>) || [];
    console.log(`[Yandex API] Processing ${points.length} data points`);

    for (const point of points) {
      // Extract dimensions
      const dimensions = point.dimensions as Record<string, unknown> || {};
      
      // Date can be an array or string
      let date = "";
      const dateVal = dimensions.date;
      if (Array.isArray(dateVal) && dateVal.length > 0) {
        date = String(dateVal[0]);
      } else if (typeof dateVal === "string") {
        date = dateVal;
      }
      
      const domain = typeof dimensions.domain === "string" ? dimensions.domain : undefined;
      const tagId = typeof dimensions.tag_id === "string" ? dimensions.tag_id : undefined;
      const tagName = typeof dimensions.tag_name === "string" ? dimensions.tag_name : undefined;

      // Extract measures (usually an array with one object)
      const measuresArray = point.measures as Array<Record<string, number>> || [];
      const metrics = measuresArray[0] || {};
      
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
   * 
   * API Docs: https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
   * 
   * Required parameters:
   * - lang: Response language
   * - period: Time interval (30days, thismonth, etc.) OR two dates: period=date1&period=date2
   * - field: Fields to include (specify multiple times, not comma-separated)
   * 
   * Grouping parameters:
   * - dimension_field: For date grouping (e.g., date|day)
   * - entity_field: For entity grouping (e.g., domain, page_id)
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

      // Build API request with correct parameter format per official docs
      // https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
      const requestParams: Record<string, string | number | string[]> = {
        lang: "en",
        // Period can be predefined (30days) or date range [startDate, endDate]
        period: [startDate, endDate], // Array for date range
        // Fields must be specified as array (sent as multiple params)
        field: ["shows", "clicks", "partner_wo_nds"],
        // Grouping by date (day)
        dimension_field: "date|day",
        // Grouping by domain
        entity_field: "domain",
        currency: "USD",
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
   * 
   * Uses entity_field=domain to group by domain
   * API docs: https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
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
      console.log("[Yandex API] Fetching domains...");

      // Use correct parameters per official docs
      const requestParams: Record<string, string | number | string[]> = {
        lang: "en",
        period: "30days", // Last 30 days
        field: ["shows", "clicks", "partner_wo_nds"], // Fields to include
        entity_field: "domain", // Group by domain
        currency: "USD",
      };

      const result = await this.makeApiRequest(requestParams);

      if (!result.success || !result.data) {
        return { success: false, domains: [], error: result.error };
      }

      // Navigate to the correct data structure (data.points)
      const data = result.data.data as Record<string, unknown> | undefined;
      if (!data) {
        console.warn("[Yandex API] No 'data' field in response");
        return { success: true, domains: [] };
      }

      const points = (data.points as Array<Record<string, unknown>>) || [];
      console.log(`[Yandex API] Processing ${points.length} domain points`);

      const domains: Array<{
        domain: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }> = [];

      for (const point of points) {
        const dimensions = point.dimensions as Record<string, unknown> || {};
        const measuresArray = point.measures as Array<Record<string, number>> || [];
        const metrics = measuresArray[0] || {};
        
        const domain = typeof dimensions.domain === "string" ? dimensions.domain : "";
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
   * 
   * Uses entity_field to group by page_id (tag/adunit)
   * API docs: https://yandex.ru/dev/partner-statistics/doc/en/reference/statistics-get2
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
      console.log("[Yandex API] Fetching tags...");

      // Use correct parameters per official docs
      // entity_field can be: page_id, domain, block_id, etc.
      const requestParams: Record<string, string | number | string[]> = {
        lang: "en",
        period: "30days",
        field: ["shows", "clicks", "partner_wo_nds"],
        entity_field: ["page_id", "domain"], // Group by page (tag) and domain
        currency: "USD",
      };

      const result = await this.makeApiRequest(requestParams);

      if (!result.success || !result.data) {
        return { success: false, tags: [], error: result.error };
      }

      // Navigate to the correct data structure
      const data = result.data.data as Record<string, unknown> | undefined;
      if (!data) {
        console.warn("[Yandex API] No 'data' field in response");
        return { success: true, tags: [] };
      }

      const points = (data.points as Array<Record<string, unknown>>) || [];
      console.log(`[Yandex API] Processing ${points.length} tag points`);

      const tags: Array<{
        tagId: string;
        tagName: string;
        domain?: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }> = [];

      for (const point of points) {
        const dimensions = point.dimensions as Record<string, unknown> || {};
        const measuresArray = point.measures as Array<Record<string, number>> || [];
        const metrics = measuresArray[0] || {};
        
        // page_id is the tag/adunit identifier in Yandex
        const tagId = typeof dimensions.page_id === "string" ? dimensions.page_id : "";
        if (!tagId) continue;

        tags.push({
          tagId,
          tagName: typeof dimensions.page_name === "string" ? dimensions.page_name : tagId,
          domain: typeof dimensions.domain === "string" ? dimensions.domain : undefined,
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

// ============================================
// Factory & Exports
// ============================================

/**
 * Create a Yandex client with specific credentials (for multi-account support).
 * 
 * @example
 * const client = createYandexClient({
 *   oauthToken: "y0_abc123...",
 * });
 */
export function createYandexClient(
  credentials: YandexCredentials,
  options?: { accountId?: string; accountName?: string }
): YandexClient {
  return new YandexClient({
    oauthToken: credentials.oauthToken,
    accountId: options?.accountId,
    accountName: options?.accountName,
  });
}

// Export singleton instance (uses environment variables - backward compatible)
export const yandexClient = new YandexClient();

// Export the class for typing
export { YandexClient };

