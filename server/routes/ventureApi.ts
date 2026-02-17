import type { Express } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import type { SubscriptionTier } from "@shared/schema";
import { and, gte, sql, isNull, inArray, or } from "drizzle-orm";

/**
 * VentureAPI Routes
 *
 * Backend API endpoint for exposing user metrics to external applications.
 *
 * Metrics:
 * - users: Non-deleted users with a paid subscription (beta/alpha/theta)
 * - activeusers: Paid users who logged in within the last 30 days
 * - leads: Non-deleted free-tier users (subscriptionTier = 'free' or null)
 */
export function registerVentureApiRoutes(app: Express) {
  app.get('/api/ventureapi', async (req, res) => {
    try {
      // Verify API key
      const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
      const ventureApiSecret = process.env.VentureAPI;

      if (!ventureApiSecret) {
        console.error('VentureAPI: VentureAPI secret not configured in environment');
        return res.status(500).json({
          status: 'error',
          message: 'API key not configured'
        });
      }

      if (!apiKey || apiKey !== ventureApiSecret) {
        console.warn('VentureAPI: Unauthorized access attempt');
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Invalid API key'
        });
      }

      const paidTiers: SubscriptionTier[] = ['beta', 'alpha', 'theta'];

      // Calculate date 30 days ago for active user count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total paid users (non-deleted, paid subscription tier)
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            inArray(users.subscriptionTier, paidTiers)
          )
        );

      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get active paid users (logged in within last 30 days)
      const activeUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            inArray(users.subscriptionTier, paidTiers),
            gte(users.lastLoginAt, thirtyDaysAgo)
          )
        );

      const activeUsers = activeUsersResult[0]?.count || 0;

      // Get leads (non-deleted free-tier users)
      const leadsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            or(
              sql`${users.subscriptionTier} = 'free'`,
              isNull(users.subscriptionTier)
            )
          )
        );

      const leads = leadsResult[0]?.count || 0;

      return res.json({
        status: "success",
        response: {
          users: totalUsers,
          activeusers: activeUsers,
          leads: leads
        }
      });
    } catch (error: any) {
      console.error("VentureAPI error:", error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : "Failed to fetch user metrics"
      });
    }
  });
}
