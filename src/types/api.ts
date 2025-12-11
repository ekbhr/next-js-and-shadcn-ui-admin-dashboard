/**
 * Shared API Types
 * 
 * Standard types for API requests and responses
 * to ensure consistency across all endpoints.
 */

// ============================================
// Base Response Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Sync Operation Types
// ============================================

export interface SyncResult {
  fetched: number;
  saved: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface AccountSyncResult extends SyncResult {
  accountId: string | null;
  accountName: string;
  error?: string;
}

export interface SyncResponse extends ApiResponse {
  accounts?: AccountSyncResult[];
  sync?: SyncResult;
  dateRange?: {
    start: string;
    end: string;
  };
  summary?: {
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    recordsInDb: number;
  };
  overview?: {
    synced: number;
    errors: number;
  };
}

// ============================================
// Domain Types
// ============================================

export interface DomainAssignment {
  id: string;
  domain: string;
  network: string;
  revShare: number;
  isActive: boolean;
  userId: string;
  userName?: string | null;
  userEmail?: string;
  accountId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DomainSyncResponse extends ApiResponse {
  sync?: {
    fetched: number;
    created: number;
    existing: number;
    errors: number;
  };
  networks?: Record<string, {
    fetched: number;
    created: number;
    existing: number;
    errors: number;
  }>;
  networkStatus?: {
    sedo: boolean;
    yandex: boolean;
  };
  assignments?: DomainAssignment[];
}

// ============================================
// User Types
// ============================================

export interface UserInfo {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  isActive?: boolean;
  createdAt?: Date | string;
}

export interface PaymentDetailsInfo {
  id: string;
  preferredMethod: string;
  paypalEmail?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  bankAddress?: string | null;
  bankCurrency?: string | null;
  wiseEmail?: string | null;
}

// ============================================
// Network Account Types
// ============================================

export type NetworkType = "sedo" | "yandex";

export interface NetworkAccountInfo {
  id: string;
  network: NetworkType;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  domainCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Report Types
// ============================================

export interface RevenueRecord {
  id: string;
  date: Date | string;
  domain?: string | null;
  grossRevenue: number;
  netRevenue: number;
  revShare: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr?: number | null;
  rpm?: number | null;
  userId: string;
  accountId?: string | null;
}

export interface SedoRevenueRecord extends RevenueRecord {
  c1?: string | null;
  c2?: string | null;
  c3?: string | null;
  tag?: string | null;
}

export interface YandexRevenueRecord extends RevenueRecord {
  tagName?: string | null;
  tagId?: string | null;
  pageId?: string | null;
}

// ============================================
// Settings Types
// ============================================

export interface SystemSettingsInfo {
  id: string;
  defaultRevShare: number;
  emailOnSyncFailure: boolean;
  emailWeeklySummary: boolean;
  adminEmail?: string | null;
  lastSedoSync?: Date | string | null;
  lastYandexSync?: Date | string | null;
  lastDomainSync?: Date | string | null;
}

// ============================================
// Error Types
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  validationErrors?: ValidationError[];
  statusCode?: number;
}

// ============================================
// Utility Types
// ============================================

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

