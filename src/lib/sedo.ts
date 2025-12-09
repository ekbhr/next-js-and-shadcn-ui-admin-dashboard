/**
 * Sedo API Client
 *
 * This service handles fetching data from Sedo.com's API
 * API Documentation: https://api.sedo.com/apidocs/v1/
 *
 * Authentication requires 4 credentials:
 * - Partner ID: Account identifier from Sedo Partner Program
 * - SignKey: API authentication key
 * - Username: Sedo account username
 * - Password: Sedo account password
 */

import axios from "axios";

export interface SedoReportParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  domain?: string;
  format?: "json" | "csv";
}

export interface SedoRevenueData {
  date: string;
  domain?: string;
  revenue: number;
  clicks?: number;
  impressions?: number;
  uniques?: number;
  ctr?: number; // Click-through rate
  rpm?: number; // Revenue per mille
  epc?: number; // Earnings per click
  geo?: string;
  device?: string;
}

export interface SedoReportResponse {
  success: boolean;
  data?: SedoRevenueData[];
  error?: string;
  totalRevenue?: number;
  totalClicks?: number;
  totalImpressions?: number;
  totalUniques?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

class SedoClient {
  private signKey?: string;
  private partnerId?: string;
  private username?: string;
  private password?: string;
  private apiUrl: string;

  constructor() {
    // Load from environment variables
    this.signKey = process.env.SEDO_SIGN_KEY;
    this.partnerId = process.env.SEDO_PARTNER_ID;
    this.username = process.env.SEDO_USERNAME;
    this.password = process.env.SEDO_PASSWORD;
    this.apiUrl = process.env.SEDO_API_URL || "https://api.sedo.com/api/v1";
  }

  /**
   * Check if Sedo API is fully configured
   * Requires Partner ID, SignKey, Username, and Password
   */
  isConfigured(): boolean {
    return !!(this.signKey && this.partnerId && this.username && this.password);
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): {
    configured: boolean;
    hasSignKey: boolean;
    hasPartnerId: boolean;
    hasUsername: boolean;
    hasPassword: boolean;
    apiUrl: string;
  } {
    return {
      configured: this.isConfigured(),
      hasSignKey: !!this.signKey,
      hasPartnerId: !!this.partnerId,
      hasUsername: !!this.username,
      hasPassword: !!this.password,
      apiUrl: this.apiUrl,
    };
  }

  /**
   * Parse XML response from Sedo API
   */
  private parseXmlResponse(xmlString: string): {
    success: boolean;
    items: Array<Record<string, string | number>>;
    error?: string;
  } {
    try {
      // Check for fault response
      if (xmlString.includes("<SEDOFAULT")) {
        const faultCodeMatch = xmlString.match(/<faultcode[^>]*>([^<]+)<\/faultcode>/);
        const faultStringMatch = xmlString.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
        return {
          success: false,
          items: [],
          error: `${faultCodeMatch?.[1] || "Unknown"}: ${faultStringMatch?.[1] || "Unknown error"}`,
        };
      }

      // Parse SEDOSTATS response
      const items: Array<Record<string, string | number>> = [];
      const itemMatches = xmlString.match(/<item>([\s\S]*?)<\/item>/g);

      if (itemMatches) {
        for (const itemXml of itemMatches) {
          const item: Record<string, string | number> = {};

          // Extract all fields from the item
          const fieldMatches = itemXml.matchAll(/<(\w+)[^>]*>([^<]*)<\/\1>/g);
          for (const match of fieldMatches) {
            const fieldName = match[1];
            const fieldValue = match[2];
            
            // Convert numeric fields - handle Sedo's field names
            if (["uniques", "clicks", "views", "impressions", "visitors"].includes(fieldName)) {
              item[fieldName] = parseInt(fieldValue, 10) || 0;
            } else if (["earnings", "revenue", "epc", "rpm", "ctr"].includes(fieldName)) {
              item[fieldName] = parseFloat(fieldValue) || 0;
            } else {
              item[fieldName] = fieldValue;
            }
          }

          if (Object.keys(item).length > 0) {
            items.push(item);
          }
        }
      }

      return { success: true, items };
    } catch (error) {
      console.error("[Sedo API] XML parsing error:", error);
      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : "XML parsing failed",
      };
    }
  }

  /**
   * Make authenticated request to Sedo API (XML format)
   */
  private async makeApiRequest(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<{ success: boolean; items: Array<Record<string, string | number>>; error?: string }> {
    const url = `${this.apiUrl}/${endpoint}`;

    // Build request parameters - Sedo requires these 4 auth params
    const requestParams: Record<string, string | number | boolean> = {
      partnerid: this.partnerId!,
      signkey: this.signKey!,
      username: this.username!,
      password: this.password!,
      output_method: "xml",
    };

    // Add additional parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        requestParams[key] = value;
      }
    }

    try {
      console.log(`[Sedo API] Request to: ${endpoint}`);
      console.log(`[Sedo API] Params:`, { ...requestParams, signkey: "***", password: "***" });

      const response = await axios.get(url, {
        params: requestParams,
        headers: {
          Accept: "application/xml, text/xml, */*",
        },
        timeout: 30000,
        responseType: "text",
      });

      console.log(`[Sedo API] Response status: ${response.status}`);
      
      // Log first 500 chars of response for debugging
      const responsePreview = String(response.data).substring(0, 500);
      console.log(`[Sedo API] Response preview:`, responsePreview);

      // Parse XML response
      return this.parseXmlResponse(String(response.data));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[Sedo API] Error: ${error.message}`);
        if (error.response) {
          console.error(`[Sedo API] Response status: ${error.response.status}`);
          const errorData = String(error.response.data).substring(0, 500);
          console.error(`[Sedo API] Response data:`, errorData);
          
          // Try to parse error XML
          const parsed = this.parseXmlResponse(String(error.response.data));
          if (parsed.error) {
            return parsed;
          }
        }
        return {
          success: false,
          items: [],
          error: error.message,
        };
      }
      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Transform Sedo API items to our standard format
   * Sedo API returns: visitors, clicks, earnings, payout_status
   */
  private transformToRevenueData(
    items: Array<Record<string, string | number>>,
  ): SedoRevenueData[] {
    return items.map((item) => {
      const visitors = Number(item.visitors || item.uniques || 0);
      const clicks = Number(item.clicks || 0);
      const earnings = Number(item.earnings || item.revenue || 0);
      
      return {
        date: String(item.date || new Date().toISOString().split("T")[0]),
        domain: item.domain ? String(item.domain) : undefined,
        revenue: earnings,
        clicks: clicks,
        impressions: visitors, // Sedo calls it "visitors"
        uniques: visitors,
        ctr: visitors > 0 ? Math.round((clicks / visitors) * 10000) / 100 : 0,
        rpm: visitors > 0 ? Math.round((earnings / visitors) * 1000 * 100) / 100 : 0,
        epc: clicks > 0 ? Math.round((earnings / clicks) * 100) / 100 : 0,
        geo: item.country ? String(item.country) : undefined,
        device: item.device ? String(item.device) : undefined,
      };
    });
  }

  /**
   * Fetch revenue data from Sedo using DomainParkingFinalStatistics
   * 
   * Period values:
   * 0 = One day (requires date)
   * 1 = Last 31 days (day by day summary)
   * 2 = One month (requires date)
   * 3 = Last 12 months
   * 4 = Last 31 days (domain summary)
   */
  async getRevenueData(
    params: SedoReportParams = {},
  ): Promise<SedoReportResponse> {
    // If credentials missing, return mock data
    if (!this.isConfigured()) {
      const config = this.getConfigStatus();
      console.warn("[Sedo API] Missing credentials:", {
        hasSignKey: config.hasSignKey,
        hasPartnerId: config.hasPartnerId,
        hasUsername: config.hasUsername,
        hasPassword: config.hasPassword,
      });
      console.warn("[Sedo API] Returning mock data");
      return this.getMockData(params);
    }

    try {
      // Use period=1 for last 31 days day-by-day summary (no date required)
      // final=false to include estimated data (today/yesterday)
      // final=true would only return confirmed data (48+ hours old)
      const result = await this.makeApiRequest("DomainParkingFinalStatistics", {
        period: 1, // Last 31 days as day by day summary
        final: false, // Include estimated/recent data (not just final)
        domain: params.domain,
        startfrom: 0,
        results: 0, // 0 means all results for period 1
      });

      if (!result.success) {
        console.error(`[Sedo API] Error: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      if (result.items.length === 0) {
        console.warn("[Sedo API] No data returned from API");
        return {
          success: true,
          data: [],
          totalRevenue: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalUniques: 0,
          dateRange: { 
            start: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], 
            end: new Date().toISOString().split("T")[0] 
          },
        };
      }

      const data = this.transformToRevenueData(result.items);

      // Sort by date (oldest first)
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate totals
      const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
      const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
      const totalUniques = data.reduce((sum, d) => sum + (d.uniques || 0), 0);

      // Calculate date range from data
      const dates = data.map(d => d.date).sort();
      const startDate = dates[0] || new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = dates[dates.length - 1] || new Date().toISOString().split("T")[0];

      return {
        success: true,
        data,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalClicks,
        totalImpressions,
        totalUniques,
        dateRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error("[Sedo API] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Sedo data",
      };
    }
  }

  /**
   * Fetch revenue by geographic breakdown
   * Note: Sedo may not have a separate geo endpoint - this uses main stats
   */
  async getRevenueByGeo(
    params: SedoReportParams = {},
  ): Promise<SedoReportResponse> {
    // Use the main revenue data and group by country if available
    const revenueData = await this.getRevenueData(params);
    
    if (!revenueData.success || !revenueData.data) {
      return revenueData;
    }

    // Group by geo if available
    const geoMap = new Map<string, SedoRevenueData>();
    for (const item of revenueData.data) {
      const geo = item.geo || "Unknown";
      const existing = geoMap.get(geo);
      if (existing) {
        existing.revenue += item.revenue;
        existing.clicks = (existing.clicks || 0) + (item.clicks || 0);
        existing.impressions = (existing.impressions || 0) + (item.impressions || 0);
        existing.uniques = (existing.uniques || 0) + (item.uniques || 0);
      } else {
        geoMap.set(geo, { ...item, geo });
      }
    }

    return {
      ...revenueData,
      data: Array.from(geoMap.values()),
    };
  }

  /**
   * Fetch revenue by device breakdown
   * Note: Sedo may not have a separate device endpoint - this uses main stats
   */
  async getRevenueByDevice(
    params: SedoReportParams = {},
  ): Promise<SedoReportResponse> {
    // Use the main revenue data and group by device if available
    const revenueData = await this.getRevenueData(params);
    
    if (!revenueData.success || !revenueData.data) {
      return revenueData;
    }

    // Group by device if available
    const deviceMap = new Map<string, SedoRevenueData>();
    for (const item of revenueData.data) {
      const device = item.device || "Unknown";
      const existing = deviceMap.get(device);
      if (existing) {
        existing.revenue += item.revenue;
        existing.clicks = (existing.clicks || 0) + (item.clicks || 0);
        existing.impressions = (existing.impressions || 0) + (item.impressions || 0);
        existing.uniques = (existing.uniques || 0) + (item.uniques || 0);
      } else {
        deviceMap.set(device, { ...item, device });
      }
    }

    return {
      ...revenueData,
      data: Array.from(deviceMap.values()),
    };
  }

  /**
   * Fetch all domains from Sedo with their statistics
   * Uses period=4 (Last 31 days domain summary)
   */
  async getDomains(): Promise<{
    success: boolean;
    domains: Array<{
      domain: string;
      revenue: number;
      clicks: number;
      impressions: number;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      console.warn("[Sedo API] Not configured, cannot fetch domains");
      return { success: false, domains: [], error: "API not configured" };
    }

    try {
      // period=4 = Last 31 days domain summary (grouped by domain)
      const result = await this.makeApiRequest("DomainParkingFinalStatistics", {
        period: 4, // Domain summary
        final: false,
        startfrom: 0,
        results: 0,
      });

      if (!result.success) {
        return { success: false, domains: [], error: result.error };
      }

      // Extract unique domains with their stats
      const domainMap = new Map<string, {
        domain: string;
        revenue: number;
        clicks: number;
        impressions: number;
      }>();

      for (const item of result.items) {
        const domain = String(item.domain || "").trim();
        if (!domain) continue; // Skip empty domains

        const existing = domainMap.get(domain);
        const revenue = Number(item.earnings || item.revenue || 0);
        const clicks = Number(item.clicks || 0);
        const impressions = Number(item.visitors || item.uniques || 0);

        if (existing) {
          existing.revenue += revenue;
          existing.clicks += clicks;
          existing.impressions += impressions;
        } else {
          domainMap.set(domain, { domain, revenue, clicks, impressions });
        }
      }

      const domains = Array.from(domainMap.values())
        .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

      console.log(`[Sedo API] Found ${domains.length} domains`);
      return { success: true, domains };
    } catch (error) {
      console.error("[Sedo API] Error fetching domains:", error);
      return {
        success: false,
        domains: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mock data for development/testing when credentials are missing
   */
  private getMockData(params: SedoReportParams): SedoReportResponse {
    const startDate =
      params.startDate ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = params.endDate || new Date().toISOString().split("T")[0];

    const data: SedoRevenueData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const revenue = Math.random() * 5 + 1; // $1-$6 per day (realistic for small portfolios)
      const clicks = Math.floor(Math.random() * 50 + 10);
      const uniques = Math.floor(Math.random() * 500 + 100);

      data.push({
        date: dateStr,
        revenue: Math.round(revenue * 100) / 100,
        clicks,
        uniques,
        impressions: uniques,
        ctr: Math.round((clicks / uniques) * 10000) / 100,
        rpm: Math.round((revenue / uniques) * 1000 * 100) / 100,
      });
    }

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const totalUniques = data.reduce((sum, d) => sum + (d.uniques || 0), 0);

    return {
      success: true,
      data,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClicks,
      totalImpressions: totalUniques,
      totalUniques,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

// Export singleton instance
export const sedoClient = new SedoClient();
