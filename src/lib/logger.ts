/**
 * Simple Logger Utility
 * 
 * Provides consistent logging across the application with:
 * - Structured log format
 * - Log levels (info, warn, error, debug)
 * - Environment-aware (debug only in development)
 * - Contextual prefixes for easy filtering
 * 
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 * 
 * logger.info("Sedo Sync", "Starting sync...");
 * logger.error("Sedo Sync", "Failed to sync", error);
 * logger.debug("Sedo Sync", "Debug data", { data });
 * ```
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(entry: LogEntry): string {
  const prefix = `[${entry.context}]`;
  return `${prefix} ${entry.message}`;
}

function createLogEntry(
  level: LogLevel,
  context: string,
  message: string,
  data?: unknown
): LogEntry {
  return {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Logger instance with methods for each log level
 */
export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug(context: string, message: string, data?: unknown): void {
    if (!shouldLog("debug")) return;
    const entry = createLogEntry("debug", context, message, data);
    if (data !== undefined) {
      console.log(formatMessage(entry), data);
    } else {
      console.log(formatMessage(entry));
    }
  },

  /**
   * Info-level logging
   */
  info(context: string, message: string, data?: unknown): void {
    if (!shouldLog("info")) return;
    const entry = createLogEntry("info", context, message, data);
    if (data !== undefined) {
      console.log(formatMessage(entry), data);
    } else {
      console.log(formatMessage(entry));
    }
  },

  /**
   * Warning-level logging
   */
  warn(context: string, message: string, data?: unknown): void {
    if (!shouldLog("warn")) return;
    const entry = createLogEntry("warn", context, message, data);
    if (data !== undefined) {
      console.warn(formatMessage(entry), data);
    } else {
      console.warn(formatMessage(entry));
    }
  },

  /**
   * Error-level logging
   */
  error(context: string, message: string, error?: unknown): void {
    if (!shouldLog("error")) return;
    const entry = createLogEntry("error", context, message, error);
    if (error !== undefined) {
      console.error(formatMessage(entry), error);
    } else {
      console.error(formatMessage(entry));
    }
  },

  /**
   * Create a scoped logger with a fixed context
   */
  scope(context: string) {
    return {
      debug: (message: string, data?: unknown) => logger.debug(context, message, data),
      info: (message: string, data?: unknown) => logger.info(context, message, data),
      warn: (message: string, data?: unknown) => logger.warn(context, message, data),
      error: (message: string, error?: unknown) => logger.error(context, message, error),
    };
  },
};

// Pre-defined loggers for common contexts
export const apiLogger = logger.scope("API");
export const authLogger = logger.scope("Auth");
export const syncLogger = logger.scope("Sync");
export const cronLogger = logger.scope("Cron");

