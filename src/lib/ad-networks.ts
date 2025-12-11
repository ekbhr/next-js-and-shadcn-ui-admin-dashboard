/**
 * Ad Networks Registry
 * 
 * Central configuration for all advertising networks integrated with the platform.
 * This file serves as the single source of truth for:
 * - Network metadata (name, colors, currency)
 * - Feature capabilities (revenue, domains, tags)
 * - API client references
 * - Configuration status
 * 
 * When adding a new network:
 * 1. Create the API client (e.g., src/lib/google-adsense.ts)
 * 2. Add the network config to AD_NETWORKS below
 * 3. Create database model if needed (e.g., Bidder_Google)
 * 4. Add sync endpoints and cron jobs
 */

// ============================================
// TYPES
// ============================================

export interface NetworkFeatures {
  revenue: boolean;      // Can fetch revenue/earnings data
  domains: boolean;      // Can fetch domain list
  tags: boolean;         // Can fetch ad units/tags/placements
  dailyBreakdown: boolean; // Supports daily data breakdown
  realtime: boolean;     // Has real-time or near-real-time data
}

export interface NetworkColors {
  primary: string;       // Primary brand color (hex)
  text: string;          // Text color class
  bg: string;            // Background color class
  border: string;        // Border color class
  badge: string;         // Badge combination class
}

export interface NetworkApi {
  baseUrl: string;       // API base URL
  authType: "oauth" | "apiKey" | "basic" | "none";
  docsUrl?: string;      // Link to API documentation
}

export interface AdNetwork {
  // Identity
  id: string;            // Unique identifier (lowercase, no spaces)
  name: string;          // Full display name
  shortName: string;     // Abbreviated name for UI
  description?: string;  // Brief description
  
  // Financial
  currency: string;      // Default currency (EUR, USD, etc.)
  paymentTerms?: string; // e.g., "Net 30", "Monthly"
  minPayout?: number;    // Minimum payout threshold
  
  // Styling
  colors: NetworkColors;
  icon?: string;         // Icon name or path
  logo?: string;         // Logo URL or path
  
  // Capabilities
  features: NetworkFeatures;
  
  // API Info
  api: NetworkApi;
  
  // Status
  status: "active" | "beta" | "coming_soon" | "deprecated";
  
  // Environment variable name for API key/token
  envVar: string;
}

// ============================================
// NETWORK CONFIGURATIONS
// ============================================

export const AD_NETWORKS: Record<string, AdNetwork> = {
  sedo: {
    id: "sedo",
    name: "Sedo",
    shortName: "Sedo",
    description: "Domain parking and monetization platform",
    currency: "EUR",
    paymentTerms: "Net 30",
    minPayout: 100,
    colors: {
      primary: "#0066CC",
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: false,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://api.sedo.com/api/v1",
      authType: "apiKey",
      docsUrl: "https://sedo.com/api/",
    },
    status: "active",
    envVar: "SEDO_API_KEY",
  },

  yandex: {
    id: "yandex",
    name: "Yandex Advertising Network",
    shortName: "YAN",
    description: "Yandex Partner advertising network",
    currency: "USD",
    paymentTerms: "Monthly",
    minPayout: 10,
    colors: {
      primary: "#FC3F1D",
      text: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-100 text-orange-800 border-orange-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: true,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://partner.yandex.ru/api/statistics2/get.json",
      authType: "oauth",
      docsUrl: "https://yandex.ru/dev/partner-statistics/doc/en/",
    },
    status: "active",
    envVar: "YANDEX_API",
  },

  // ============================================
  // FUTURE NETWORKS (Templates)
  // ============================================

  google_adsense: {
    id: "google_adsense",
    name: "Google AdSense",
    shortName: "AdSense",
    description: "Google's advertising program for publishers",
    currency: "USD",
    paymentTerms: "Net 21",
    minPayout: 100,
    colors: {
      primary: "#4285F4",
      text: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100 text-green-800 border-green-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: true,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://adsense.googleapis.com/v2",
      authType: "oauth",
      docsUrl: "https://developers.google.com/adsense/management",
    },
    status: "coming_soon",
    envVar: "GOOGLE_ADSENSE_API",
  },

  taboola: {
    id: "taboola",
    name: "Taboola",
    shortName: "Taboola",
    description: "Content discovery and native advertising platform",
    currency: "USD",
    paymentTerms: "Net 45",
    minPayout: 100,
    colors: {
      primary: "#0052CC",
      text: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: true,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://backstage.taboola.com/backstage/api",
      authType: "oauth",
      docsUrl: "https://developers.taboola.com/",
    },
    status: "coming_soon",
    envVar: "TABOOLA_API",
  },

  outbrain: {
    id: "outbrain",
    name: "Outbrain",
    shortName: "Outbrain",
    description: "Native advertising and content recommendation",
    currency: "USD",
    paymentTerms: "Net 60",
    minPayout: 50,
    colors: {
      primary: "#F26522",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: false,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://api.outbrain.com/amplify/v0.1",
      authType: "apiKey",
      docsUrl: "https://www.outbrain.com/developers/",
    },
    status: "coming_soon",
    envVar: "OUTBRAIN_API",
  },

  media_net: {
    id: "media_net",
    name: "Media.net",
    shortName: "Media.net",
    description: "Contextual advertising network by Yahoo/Bing",
    currency: "USD",
    paymentTerms: "Net 30",
    minPayout: 100,
    colors: {
      primary: "#00A4E4",
      text: "text-cyan-700",
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: true,
      dailyBreakdown: true,
      realtime: false,
    },
    api: {
      baseUrl: "https://api.media.net",
      authType: "apiKey",
      docsUrl: "https://www.media.net/",
    },
    status: "coming_soon",
    envVar: "MEDIA_NET_API",
  },

  ezoic: {
    id: "ezoic",
    name: "Ezoic",
    shortName: "Ezoic",
    description: "AI-powered ad optimization platform",
    currency: "USD",
    paymentTerms: "Net 30",
    minPayout: 20,
    colors: {
      primary: "#6366F1",
      text: "text-violet-700",
      bg: "bg-violet-50",
      border: "border-violet-200",
      badge: "bg-violet-100 text-violet-800 border-violet-200",
    },
    features: {
      revenue: true,
      domains: true,
      tags: true,
      dailyBreakdown: true,
      realtime: true,
    },
    api: {
      baseUrl: "https://api.ezoic.com",
      authType: "apiKey",
      docsUrl: "https://www.ezoic.com/",
    },
    status: "coming_soon",
    envVar: "EZOIC_API",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all networks
 */
export function getAllNetworks(): AdNetwork[] {
  return Object.values(AD_NETWORKS);
}

/**
 * Get network by ID
 */
export function getNetworkById(id: string): AdNetwork | undefined {
  return AD_NETWORKS[id];
}

/**
 * Get networks by status
 */
export function getNetworksByStatus(status: AdNetwork["status"]): AdNetwork[] {
  return getAllNetworks().filter((n) => n.status === status);
}

/**
 * Get active networks only
 */
export function getActiveNetworks(): AdNetwork[] {
  return getNetworksByStatus("active");
}

/**
 * Get networks that support a specific feature
 */
export function getNetworksWithFeature(
  feature: keyof NetworkFeatures
): AdNetwork[] {
  return getAllNetworks().filter((n) => n.features[feature]);
}

/**
 * Check if a network is configured (env var is set)
 */
export function isNetworkConfigured(networkId: string): boolean {
  const network = getNetworkById(networkId);
  if (!network) return false;
  return !!process.env[network.envVar];
}

/**
 * Get all configured networks (active + env var set)
 */
export function getConfiguredNetworks(): AdNetwork[] {
  return getActiveNetworks().filter((n) => isNetworkConfigured(n.id));
}

/**
 * Get network colors for UI
 */
export function getNetworkColors(networkId: string): NetworkColors {
  const network = getNetworkById(networkId);
  return (
    network?.colors || {
      primary: "#6B7280",
      text: "text-gray-700",
      bg: "bg-gray-50",
      border: "border-gray-200",
      badge: "bg-gray-100 text-gray-800 border-gray-200",
    }
  );
}

/**
 * Get network display name
 */
export function getNetworkName(
  networkId: string,
  short: boolean = false
): string {
  const network = getNetworkById(networkId);
  if (!network) return networkId;
  return short ? network.shortName : network.name;
}

/**
 * Get network currency
 */
export function getNetworkCurrency(networkId: string): string {
  return getNetworkById(networkId)?.currency || "USD";
}

/**
 * Get all unique currencies used by active networks
 */
export function getAllCurrencies(): string[] {
  const currencies = new Set(getActiveNetworks().map((n) => n.currency));
  return Array.from(currencies);
}

/**
 * Format currency amount with network-specific currency
 */
export function formatNetworkAmount(
  amount: number,
  networkId: string
): string {
  const currency = getNetworkCurrency(networkId);
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * Union type of all network IDs
 */
export type NetworkId = keyof typeof AD_NETWORKS;

/**
 * Array of all network IDs
 */
export const NETWORK_IDS = Object.keys(AD_NETWORKS) as NetworkId[];

/**
 * Active network IDs only
 */
export const ACTIVE_NETWORK_IDS = getActiveNetworks().map(
  (n) => n.id
) as NetworkId[];

