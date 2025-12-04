import type { Express, Request, Response } from "express";
import { db } from "../db";
import { pageViews, linkClicks, landingPages, landingPageLinks } from "@shared/schema";
import { eq, and, sql, count, countDistinct, avg } from "drizzle-orm";
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
}
