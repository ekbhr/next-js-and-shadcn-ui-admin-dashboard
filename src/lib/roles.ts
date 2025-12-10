/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Roles:
 * - "admin": Full access to all features, can see gross revenue, manage domains
 * - "user": Limited access, can only see net revenue and their own data
 */

export type UserRole = "admin" | "user";

export const ROLES = {
  ADMIN: "admin" as const,
  USER: "user" as const,
};

/**
 * Check if user has admin role
 */
export function isAdmin(role?: string | null): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Check if user can view gross revenue
 * Only admins can see gross revenue
 */
export function canViewGrossRevenue(role?: string | null): boolean {
  return isAdmin(role);
}

/**
 * Check if user can access admin section
 * Only admins can access domain assignment, settings, etc.
 */
export function canAccessAdminSection(role?: string | null): boolean {
  return isAdmin(role);
}

/**
 * Get default role for new users
 */
export function getDefaultRole(): UserRole {
  return ROLES.USER;
}

