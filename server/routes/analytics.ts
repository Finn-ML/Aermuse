import type { Express, Request, Response } from "express";
import { db } from "../db";
import { pageViews, linkClicks, landingPages, landingPageLinks, tracks, trackPurchases } from "@shared/schema";
import { eq, and, sql, count, countDistinct, avg, sum, desc, gte, inArray } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

// Generate visitor hash from IP and User-Agent (privacy-conscious)
function generateVisitorHash(ip: string, userAgent: string): string {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Get client IP address (handles proxies)
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Validation schemas
const trackPageViewSchema = z.object({
  landingPageId: z.string().min(1),
  sessionId: z.string().min(1),
  referrer: z.string().nullable().optional(),
});

const trackPageEndSchema = z.object({
  endedAt: z.string().datetime(),
});

const trackClickSchema = z.object({
  linkId: z.string().min(1),
  landingPageId: z.string().min(1),
  pageViewId: z.string().nullable().optional(),
  sessionId: z.string().min(1),
});

export function registerAnalyticsRoutes(app: Express): void {
  // POST /api/analytics/pageview - Track page view (public, no auth)
  app.post("/api/analytics/pageview", async (req: Request, res: Response) => {
    try {
      const data = trackPageViewSchema.parse(req.body);

      // Verify landing page exists
      const [landingPage] = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(eq(landingPages.id, data.landingPageId))
        .limit(1);

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const visitorHash = generateVisitorHash(ip, userAgent);

      const [pageView] = await db
        .insert(pageViews)
        .values({
          landingPageId: data.landingPageId,
          visitorHash,
          sessionId: data.sessionId,
          referrer: data.referrer || null,
          userAgent,
        })
        .returning({ id: pageViews.id });

      return res.json({ pageViewId: pageView.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("[Analytics] Track pageview error:", error);
      return res.status(500).json({ error: "Failed to track page view" });
    }
  });

  // POST /api/analytics/pageview/:id/end - Update session end time (public)
  app.post("/api/analytics/pageview/:id/end", async (req: Request, res: Response) => {
    try {
      const pageViewId = req.params.id;
      const data = trackPageEndSchema.parse(req.body);

      const result = await db
        .update(pageViews)
        .set({ endedAt: new Date(data.endedAt) })
        .where(eq(pageViews.id, pageViewId))
        .returning({ id: pageViews.id });

      if (result.length === 0) {
        return res.status(404).json({ error: "Page view not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("[Analytics] Track page end error:", error);
      return res.status(500).json({ error: "Failed to update page view" });
    }
  });

  // POST /api/analytics/click - Track link click (public, no auth)
  app.post("/api/analytics/click", async (req: Request, res: Response) => {
    try {
      const data = trackClickSchema.parse(req.body);

      // Verify link exists and belongs to landing page
      const [link] = await db
        .select({ id: landingPageLinks.id })
        .from(landingPageLinks)
        .where(
          and(
            eq(landingPageLinks.id, data.linkId),
            eq(landingPageLinks.landingPageId, data.landingPageId)
          )
        )
        .limit(1);

      if (!link) {
        return res.status(404).json({ error: "Link not found" });
      }

      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const visitorHash = generateVisitorHash(ip, userAgent);

      await db.insert(linkClicks).values({
        linkId: data.linkId,
        landingPageId: data.landingPageId,
        pageViewId: data.pageViewId || null,
        visitorHash,
      });

      return res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("[Analytics] Track click error:", error);
      return res.status(500).json({ error: "Failed to track click" });
    }
  });

  // GET /api/analytics/landing-page/:id - Get aggregated stats (auth required, owner only)
  app.get("/api/analytics/landing-page/:id", async (req: Request, res: Response) => {
    try {
      const landingPageId = req.params.id;
      const userId = (req.session as any)?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify ownership
      const [landingPage] = await db
        .select({ id: landingPages.id, userId: landingPages.userId })
        .from(landingPages)
        .where(eq(landingPages.id, landingPageId))
        .limit(1);

      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      if (landingPage.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get total views
      const [viewStats] = await db
        .select({
          totalViews: count(),
          uniqueVisitors: countDistinct(pageViews.visitorHash),
        })
        .from(pageViews)
        .where(eq(pageViews.landingPageId, landingPageId));

      // Get average time on page (only for sessions with endedAt)
      const [timeStats] = await db
        .select({
          avgSeconds: avg(
            sql<number>`EXTRACT(EPOCH FROM (${pageViews.endedAt} - ${pageViews.startedAt}))`
          ),
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.landingPageId, landingPageId),
            sql`${pageViews.endedAt} IS NOT NULL`
          )
        );

      // Get total clicks
      const [clickStats] = await db
        .select({ totalClicks: count() })
        .from(linkClicks)
        .where(eq(linkClicks.landingPageId, landingPageId));

      // Calculate click rate
      const totalViews = viewStats?.totalViews || 0;
      const totalClicks = clickStats?.totalClicks || 0;
      const clickRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      // Get per-link stats
      const linkStats = await db
        .select({
          linkId: linkClicks.linkId,
          clicks: count(),
        })
        .from(linkClicks)
        .where(eq(linkClicks.landingPageId, landingPageId))
        .groupBy(linkClicks.linkId);

      return res.json({
        totalViews: viewStats?.totalViews || 0,
        uniqueVisitors: viewStats?.uniqueVisitors || 0,
        avgTimeOnPage: timeStats?.avgSeconds ? Math.round(Number(timeStats.avgSeconds)) : 0,
        clickRate: Math.round(clickRate * 10) / 10,
        linkStats,
      });
    } catch (error) {
      console.error("[Analytics] Get stats error:", error);
      return res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // GET /api/analytics/music-sales - Get music sales metrics (auth required)
  app.get("/api/analytics/music-sales", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user's landing page
      const [landingPage] = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(eq(landingPages.userId, userId))
        .limit(1);

      if (!landingPage) {
        // Return empty metrics if no landing page
        return res.json({
          totalRevenue: 0,
          totalSales: 0,
          totalPlays: 0,
          revenueThisMonth: 0,
          salesThisMonth: 0,
          topTracks: [],
        });
      }

      // Get all tracks for this landing page
      const userTracks = await db
        .select({
          id: tracks.id,
          title: tracks.title,
          playCount: tracks.playCount,
          purchaseCount: tracks.purchaseCount,
          coverArtPath: tracks.coverArtPath,
        })
        .from(tracks)
        .where(eq(tracks.landingPageId, landingPage.id));

      const trackIds = userTracks.map(t => t.id);

      if (trackIds.length === 0) {
        return res.json({
          totalRevenue: 0,
          totalSales: 0,
          totalPlays: 0,
          revenueThisMonth: 0,
          salesThisMonth: 0,
          topTracks: [],
        });
      }

      // Calculate total plays from tracks
      const totalPlays = userTracks.reduce((sum, t) => sum + (t.playCount || 0), 0);

      // Get all completed purchases for user's tracks
      const allPurchases = await db
        .select({
          trackId: trackPurchases.trackId,
          amountPaidCents: trackPurchases.amountPaidCents,
          createdAt: trackPurchases.createdAt,
        })
        .from(trackPurchases)
        .where(
          and(
            inArray(trackPurchases.trackId, trackIds),
            eq(trackPurchases.status, 'completed')
          )
        );

      // Calculate totals
      const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.amountPaidCents || 0), 0);
      const totalSales = allPurchases.length;

      // Calculate this month's metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthPurchases = allPurchases.filter(p =>
        p.createdAt && new Date(p.createdAt) >= startOfMonth
      );

      const revenueThisMonth = thisMonthPurchases.reduce((sum, p) => sum + (p.amountPaidCents || 0), 0);
      const salesThisMonth = thisMonthPurchases.length;

      // Get top selling tracks (by purchase count)
      const topTracks = userTracks
        .filter(t => (t.purchaseCount || 0) > 0)
        .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: t.title,
          sales: t.purchaseCount || 0,
          plays: t.playCount || 0,
          coverArtPath: t.coverArtPath,
        }));

      return res.json({
        totalRevenue,
        totalSales,
        totalPlays,
        revenueThisMonth,
        salesThisMonth,
        topTracks,
      });
    } catch (error) {
      console.error("[Analytics] Get music sales error:", error);
      return res.status(500).json({ error: "Failed to get music sales metrics" });
    }
  });
}
