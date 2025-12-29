/**
 * Admin Activity Logging Service
 * Epic 6: Admin Dashboard - Story 6.9
 *
 * Provides functionality to log and retrieve admin activity.
 */

import { db } from "../db";
import { adminActivityLog, users } from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import type { Request } from "express";

// ============================================
// ACTION TYPES
// ============================================

export type AdminAction =
  // User Management
  | "user_create"
  | "user_update"
  | "user_delete"
  | "user_role_change"
  | "user_subscription_change"
  // Template Management
  | "template_create"
  | "template_update"
  | "template_delete"
  | "template_activate"
  | "template_deactivate"
  | "template_clone"
  // Contract Management
  | "contract_delete"
  | "contract_update"
  // System Settings
  | "settings_update"
  // Export Operations
  | "export_users"
  | "export_contracts"
  | "export_activity"
  // Other
  | "login"
  | "logout";

export type EntityType =
  | "user"
  | "template"
  | "contract"
  | "settings"
  | "system";

// ============================================
// ACTION DESCRIPTIONS (for display)
// ============================================

export const ACTION_DESCRIPTIONS: Record<AdminAction, string> = {
  user_create: "Created user",
  user_update: "Updated user",
  user_delete: "Deleted user",
  user_role_change: "Changed user role",
  user_subscription_change: "Changed user subscription",
  template_create: "Created template",
  template_update: "Updated template",
  template_delete: "Deleted template",
  template_activate: "Activated template",
  template_deactivate: "Deactivated template",
  template_clone: "Cloned template",
  contract_delete: "Deleted contract",
  contract_update: "Updated contract",
  settings_update: "Updated system settings",
  export_users: "Exported users",
  export_contracts: "Exported contracts",
  export_activity: "Exported activity log",
  login: "Logged in",
  logout: "Logged out",
};

// ============================================
// LOGGING FUNCTION
// ============================================

interface LogActivityParams {
  adminId: string;
  action: AdminAction;
  entityType: EntityType;
  entityId?: string | null;
  details?: Record<string, unknown>;
  req?: Request;
}

/**
 * Log an admin activity to the database
 */
export async function logAdminActivity({
  adminId,
  action,
  entityType,
  entityId,
  details,
  req,
}: LogActivityParams): Promise<void> {
  try {
    // Extract IP address from request
    let ipAddress: string | null = null;
    if (req) {
      ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        || req.socket?.remoteAddress
        || null;
    }

    await db.insert(adminActivityLog).values({
      adminId,
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
      ipAddress,
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break admin operations
    console.error("[ADMIN_ACTIVITY] Failed to log activity:", error);
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

interface GetActivityParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  adminId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface ActivityWithAdmin {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date | null;
}

interface GetActivityResult {
  activities: ActivityWithAdmin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get activity logs with pagination and filtering
 */
export async function getActivityLogs({
  page = 1,
  limit = 50,
  action,
  entityType,
  adminId,
  dateFrom,
  dateTo,
}: GetActivityParams): Promise<GetActivityResult> {
  const offset = (page - 1) * limit;

  // Build conditions array
  const conditions = [];

  if (action) {
    conditions.push(eq(adminActivityLog.action, action));
  }

  if (entityType) {
    conditions.push(eq(adminActivityLog.entityType, entityType));
  }

  if (adminId) {
    conditions.push(eq(adminActivityLog.adminId, adminId));
  }

  if (dateFrom) {
    conditions.push(gte(adminActivityLog.createdAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(adminActivityLog.createdAt, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminActivityLog)
    .where(whereClause);

  const total = countResult?.count || 0;

  // Get activities with admin info
  const activities = await db
    .select({
      id: adminActivityLog.id,
      adminId: adminActivityLog.adminId,
      adminName: users.name,
      adminEmail: users.email,
      action: adminActivityLog.action,
      entityType: adminActivityLog.entityType,
      entityId: adminActivityLog.entityId,
      details: adminActivityLog.details,
      ipAddress: adminActivityLog.ipAddress,
      createdAt: adminActivityLog.createdAt,
    })
    .from(adminActivityLog)
    .leftJoin(users, eq(adminActivityLog.adminId, users.id))
    .where(whereClause)
    .orderBy(desc(adminActivityLog.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    activities: activities.map(a => ({
      ...a,
      adminEmail: a.adminEmail || "Unknown",
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get list of unique actions that have been logged
 */
export async function getAvailableActions(): Promise<string[]> {
  const results = await db
    .selectDistinct({ action: adminActivityLog.action })
    .from(adminActivityLog)
    .orderBy(adminActivityLog.action);

  return results.map(r => r.action);
}

/**
 * Get list of admins who have activity logged
 */
export async function getActiveAdmins(): Promise<Array<{ id: string; name: string | null; email: string }>> {
  const results = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(adminActivityLog)
    .innerJoin(users, eq(adminActivityLog.adminId, users.id))
    .orderBy(users.name);

  return results;
}
