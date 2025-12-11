/**
 * Encryption Utility
 * 
 * Secure encryption for storing sensitive data like API credentials.
 * Uses AES-256-GCM with random IVs for each encryption.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Get or generate the encryption key from environment variable.
 * The key should be a 32-byte (64 hex character) string.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  
  if (keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
      "Current length: " + keyHex.length
    );
  }
  
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a string value.
 * Returns a base64-encoded string containing IV + encrypted data + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, "hex"),
    authTag,
  ]);
  
  return combined.toString("base64");
}

/**
 * Decrypt a string that was encrypted with encrypt().
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");
  
  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString("utf8");
}

/**
 * Encrypt an object (serializes to JSON first).
 */
export function encryptObject<T extends object>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object (parses JSON after decryption).
 */
export function decryptObject<T>(encryptedBase64: string): T {
  const json = decrypt(encryptedBase64);
  return JSON.parse(json) as T;
}

// ============================================
// Credential Types
// ============================================

export interface SedoCredentials {
  partnerId: string;
  signKey: string;
  username: string;
  password: string;
}

export interface YandexCredentials {
  oauthToken: string;
}

export type NetworkCredentials = SedoCredentials | YandexCredentials;

/**
 * Type guard to check if credentials are Sedo credentials.
 */
export function isSedoCredentials(creds: NetworkCredentials): creds is SedoCredentials {
  return "partnerId" in creds && "signKey" in creds;
}

/**
 * Type guard to check if credentials are Yandex credentials.
 */
export function isYandexCredentials(creds: NetworkCredentials): creds is YandexCredentials {
  return "oauthToken" in creds;
}

