/**
 * API Key Management
 * 
 * Handles creation, validation, and management of API keys
 * for publisher programmatic access.
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// API key prefix for identification
const API_KEY_PREFIX = "rem_"; // RevEngine Media

// ============================================
// Key Generation
// ============================================

/**
 * Generate a new API key
 * Returns both the raw key (to show user once) and the hashed version (to store)
 */
export function generateApiKey(): {
  rawKey: string;
  hashedKey: string;
  keyPrefix: string;
} {
  // Generate 32 random bytes, encode as base64url
  const randomBytes = crypto.randomBytes(32);
  const rawKey = API_KEY_PREFIX + randomBytes.toString("base64url");
  
  // Hash the key for storage
  const hashedKey = hashApiKey(rawKey);
  
  // Keep prefix for display (first 12 chars including prefix)
  const keyPrefix = rawKey.substring(0, 12) + "...";
  
  return { rawKey, hashedKey, keyPrefix };
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// ============================================
// Key Validation
// ============================================

/**
 * Validate an API key and return the associated user
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  apiKeyId?: string;
  scopes?: string[];
  error?: string;
}> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hashedKey = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: {
        select: { id: true, isActive: true },
      },
    },
  });

  if (!apiKey) {
    return { valid: false, error: "API key not found" };
  }

  if (!apiKey.isActive) {
    return { valid: false, error: "API key is disabled" };
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return { valid: false, error: "API key has expired" };
  }

  if (!apiKey.user.isActive) {
    return { valid: false, error: "User account is disabled" };
  }

  // Update last used timestamp (don't await - fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { 
      lastUsedAt: new Date(),
      requestCount: { increment: 1 },
    },
  }).catch(console.error);

  return {
    valid: true,
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}

// ============================================
// Key Management
// ============================================

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  options: {
    scopes?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  } = {}
): Promise<{
  id: string;
  name: string;
  rawKey: string; // Only returned once!
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  expiresAt: Date | null;
  createdAt: Date;
}> {
  const { rawKey, hashedKey, keyPrefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      key: hashedKey,
      keyPrefix,
      scopes: options.scopes || ["reports:read"],
      rateLimit: options.rateLimit || 100,
      expiresAt: options.expiresAt || null,
    },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    rawKey, // Show to user ONCE
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes,
    rateLimit: apiKey.rateLimit,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Get all API keys for a user (without the actual key)
 */
export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      requestCount: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  const result = await prisma.apiKey.deleteMany({
    where: { id: keyId, userId },
  });
  return result.count > 0;
}

/**
 * Toggle API key active status
 */
export async function toggleApiKey(keyId: string, userId: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!apiKey) return false;

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: !apiKey.isActive },
  });

  return true;
}

/**
 * Update API key name
 */
export async function updateApiKeyName(
  keyId: string,
  userId: string,
  name: string
): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, userId },
    data: { name },
  });
  return result.count > 0;
}

// ============================================
// Rate Limiting
// ============================================

// Simple in-memory rate limit tracking
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if an API key has exceeded its rate limit
 */
export async function checkRateLimit(apiKeyId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { rateLimit: true },
  });

  if (!apiKey) {
    return { allowed: false, remaining: 0, resetAt: new Date() };
  }

  const now = Date.now();
  const hourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
  const hourEnd = hourStart + 60 * 60 * 1000;

  const existing = rateLimitMap.get(apiKeyId);

  if (!existing || existing.resetAt < now) {
    // New hour, reset counter
    rateLimitMap.set(apiKeyId, { count: 1, resetAt: hourEnd });
    return {
      allowed: true,
      remaining: apiKey.rateLimit - 1,
      resetAt: new Date(hourEnd),
    };
  }

  if (existing.count >= apiKey.rateLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: apiKey.rateLimit - existing.count,
    resetAt: new Date(existing.resetAt),
  };
}

// ============================================
// Available Scopes
// ============================================

export const API_SCOPES = {
  "reports:read": "Read revenue reports",
  "reports:export": "Export reports as CSV",
} as const;

export type ApiScope = keyof typeof API_SCOPES;

