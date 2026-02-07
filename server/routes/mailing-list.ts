import type { Express, Request, Response } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import {
  sendSubscriptionConfirmationEmail,
  sendBroadcastBatch,
} from "../services/postmark";

function getBaseUrl(req: Request): string {
  const origin = req.get("origin");
  if (origin) return origin;
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) return `${protocol}://${host}`;
  return process.env.APP_URL || "http://localhost:5000";
}

// Rate limiter for public subscribe endpoint: 10 requests per hour per IP
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many subscription attempts. Please try again later." },
});

export function registerMailingListRoutes(app: Express): void {
  // ============================================
  // PUBLIC ROUTES (no auth)
  // ============================================

  // 1. POST /api/artist/:slug/subscribe — Subscribe to an artist's mailing list
  app.post(
    "/api/artist/:slug/subscribe",
    subscribeLimiter,
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        const { email, name } = req.body;

        if (!email || typeof email !== "string") {
          return res.status(400).json({ error: "Email is required" });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({ error: "Invalid email address" });
        }

        // Find landing page by slug
        const landingPage = await storage.getLandingPageBySlug(slug);
        if (!landingPage) {
          return res.status(404).json({ error: "Artist page not found" });
        }

        // Check if subscriber already exists
        const existing = await storage.getSubscriberByEmail(
          landingPage.id,
          email.trim().toLowerCase()
        );

        if (existing) {
          if (existing.status === "active") {
            return res.json({
              success: true,
              message: "Already subscribed",
            });
          }

          // If pending, resend confirmation email
          if (existing.status === "pending") {
            const confirmationToken =
              existing.confirmationToken ||
              crypto.randomBytes(32).toString("hex");

            // Update token if it was missing
            if (!existing.confirmationToken) {
              await storage.updateSubscriber(existing.id, {
                confirmationToken,
              });
            }

            const baseUrl = getBaseUrl(req);
            const confirmUrl = `${baseUrl}/api/mailing-list/confirm/${confirmationToken}`;
            await sendSubscriptionConfirmationEmail({
              subscriberEmail: email.trim().toLowerCase(),
              subscriberName: name || null,
              artistName: landingPage.artistName,
              confirmUrl,
            });

            return res.json({
              success: true,
              message: "Check your email to confirm your subscription",
            });
          }

          // If unsubscribed, resubscribe as pending
          if (existing.status === "unsubscribed") {
            const confirmationToken = crypto
              .randomBytes(32)
              .toString("hex");

            await storage.updateSubscriber(existing.id, {
              status: "pending",
              confirmationToken,
              name: name || existing.name,
              unsubscribedAt: null,
            });

            const baseUrl = getBaseUrl(req);
            const confirmUrl = `${baseUrl}/api/mailing-list/confirm/${confirmationToken}`;
            await sendSubscriptionConfirmationEmail({
              subscriberEmail: email.trim().toLowerCase(),
              subscriberName: name || null,
              artistName: landingPage.artistName,
              confirmUrl,
            });

            return res.json({
              success: true,
              message: "Check your email to confirm your subscription",
            });
          }
        }

        // Create new subscriber
        const confirmationToken = crypto.randomBytes(32).toString("hex");

        await storage.createSubscriber({
          landingPageId: landingPage.id,
          email: email.trim().toLowerCase(),
          name: name || null,
          status: "pending",
          confirmationToken,
        });

        const baseUrl = getBaseUrl(req);
        const confirmUrl = `${baseUrl}/api/mailing-list/confirm/${confirmationToken}`;
        await sendSubscriptionConfirmationEmail({
          subscriberEmail: email.trim().toLowerCase(),
          subscriberName: name || null,
          artistName: landingPage.artistName,
          confirmUrl,
        });

        return res.json({
          success: true,
          message: "Check your email to confirm your subscription",
        });
      } catch (error) {
        console.error("[Mailing List] Subscribe error:", error);
        return res.status(500).json({ error: "Failed to subscribe" });
      }
    }
  );

  // 2. GET /api/mailing-list/confirm/:token — Confirm email subscription
  app.get(
    "/api/mailing-list/confirm/:token",
    async (req: Request, res: Response) => {
      try {
        const { token } = req.params;

        const subscriber = await storage.getSubscriberByToken(token);
        if (!subscriber) {
          return res
            .status(404)
            .send(
              "<html><body><h1>Invalid or expired confirmation link</h1><p>This link may have already been used or has expired.</p></body></html>"
            );
        }

        if (subscriber.status === "active") {
          const baseUrl = getBaseUrl(req);
          return res.redirect(`${baseUrl}?subscribed=true`);
        }

        await storage.updateSubscriber(subscriber.id, {
          status: "active",
          subscribedAt: new Date(),
          confirmationToken: null,
        });

        const baseUrl = getBaseUrl(req);
        return res.redirect(`${baseUrl}?subscribed=true`);
      } catch (error) {
        console.error("[Mailing List] Confirm error:", error);
        return res.status(500).send("<html><body><h1>Something went wrong</h1><p>Please try again later.</p></body></html>");
      }
    }
  );

  // 3. GET /api/mailing-list/unsubscribe/:token — Unsubscribe (uses subscriber ID)
  app.get(
    "/api/mailing-list/unsubscribe/:token",
    async (req: Request, res: Response) => {
      try {
        const { token } = req.params;

        const subscriber = await storage.getSubscriber(token);
        if (!subscriber) {
          return res
            .status(404)
            .send(
              "<html><body><h1>Subscriber not found</h1><p>This unsubscribe link may be invalid.</p></body></html>"
            );
        }

        if (subscriber.status !== "unsubscribed") {
          await storage.updateSubscriber(subscriber.id, {
            status: "unsubscribed",
            unsubscribedAt: new Date(),
          });
        }

        return res.send(
          `<html>
<head><title>Unsubscribed</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}div{text-align:center;padding:2rem}</style></head>
<body><div><h1>You've been unsubscribed</h1><p>You will no longer receive emails from this mailing list.</p></div></body>
</html>`
        );
      } catch (error) {
        console.error("[Mailing List] Unsubscribe error:", error);
        return res.status(500).send("<html><body><h1>Something went wrong</h1><p>Please try again later.</p></body></html>");
      }
    }
  );

  // ============================================
  // AUTHENTICATED ROUTES (artist)
  // ============================================

  // 4. GET /api/mailing-list/subscribers — List subscribers for the authenticated user's landing page
  app.get(
    "/api/mailing-list/subscribers",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;

        const landingPage = await storage.getLandingPageByUser(userId);
        if (!landingPage) {
          return res.json({ subscribers: [], counts: { total: 0, active: 0, unsubscribed: 0 } });
        }

        const [subscribers, counts] = await Promise.all([
          storage.getSubscribersByLandingPage(landingPage.id),
          storage.getSubscriberCountsByLandingPage(landingPage.id),
        ]);

        return res.json({ subscribers, counts });
      } catch (error) {
        console.error("[Mailing List] Get subscribers error:", error);
        return res.status(500).json({ error: "Failed to get subscribers" });
      }
    }
  );

  // 5. DELETE /api/mailing-list/subscribers/:id — Delete a subscriber
  app.delete(
    "/api/mailing-list/subscribers/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        // Verify subscriber belongs to user's landing page
        const landingPage = await storage.getLandingPageByUser(userId);
        if (!landingPage) {
          return res.status(404).json({ error: "Landing page not found" });
        }

        const subscriber = await storage.getSubscriber(id);
        if (!subscriber) {
          return res.status(404).json({ error: "Subscriber not found" });
        }

        if (subscriber.landingPageId !== landingPage.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        await storage.deleteSubscriber(id);

        return res.json({ success: true });
      } catch (error) {
        console.error("[Mailing List] Delete subscriber error:", error);
        return res.status(500).json({ error: "Failed to delete subscriber" });
      }
    }
  );

  // ============================================
  // CAMPAIGN ROUTES (authenticated)
  // ============================================

  // 6. GET /api/mailing-list/campaigns — List campaigns for authenticated user
  app.get(
    "/api/mailing-list/campaigns",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const campaigns = await storage.getCampaignsByUser(userId);
        return res.json({ campaigns });
      } catch (error) {
        console.error("[Mailing List] Get campaigns error:", error);
        return res.status(500).json({ error: "Failed to get campaigns" });
      }
    }
  );

  // 7. POST /api/mailing-list/campaigns — Create a new campaign
  app.post(
    "/api/mailing-list/campaigns",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { subject, body, previewText } = req.body;

        if (!subject || typeof subject !== "string") {
          return res.status(400).json({ error: "Subject is required" });
        }

        if (!body || typeof body !== "string") {
          return res.status(400).json({ error: "Body is required" });
        }

        const campaign = await storage.createCampaign({
          userId,
          subject,
          body,
          previewText: previewText || null,
          status: "draft",
        });

        return res.status(201).json({ campaign });
      } catch (error) {
        console.error("[Mailing List] Create campaign error:", error);
        return res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  );

  // 8. GET /api/mailing-list/campaigns/:id — Get campaign detail
  app.get(
    "/api/mailing-list/campaigns/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        return res.json({ campaign });
      } catch (error) {
        console.error("[Mailing List] Get campaign error:", error);
        return res.status(500).json({ error: "Failed to get campaign" });
      }
    }
  );

  // 9. PATCH /api/mailing-list/campaigns/:id — Update a draft/scheduled campaign
  app.patch(
    "/api/mailing-list/campaigns/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const { subject, body, previewText } = req.body;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
          return res
            .status(400)
            .json({ error: "Can only edit draft or scheduled campaigns" });
        }

        const updateData: Record<string, any> = {};
        if (subject !== undefined) updateData.subject = subject;
        if (body !== undefined) updateData.body = body;
        if (previewText !== undefined) updateData.previewText = previewText;

        const updated = await storage.updateCampaign(id, updateData);

        return res.json({ campaign: updated });
      } catch (error) {
        console.error("[Mailing List] Update campaign error:", error);
        return res.status(500).json({ error: "Failed to update campaign" });
      }
    }
  );

  // 10. DELETE /api/mailing-list/campaigns/:id — Delete a draft campaign
  app.delete(
    "/api/mailing-list/campaigns/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only delete draft campaigns" });
        }

        await storage.deleteCampaign(id);

        return res.json({ success: true });
      } catch (error) {
        console.error("[Mailing List] Delete campaign error:", error);
        return res.status(500).json({ error: "Failed to delete campaign" });
      }
    }
  );

  // 11. POST /api/mailing-list/campaigns/:id/send — Send a campaign immediately
  app.post(
    "/api/mailing-list/campaigns/:id/send",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (campaign.status !== "draft" && campaign.status !== "scheduled") {
          return res
            .status(400)
            .json({ error: "Campaign has already been sent" });
        }

        // Get user's landing page
        const landingPage = await storage.getLandingPageByUser(userId);
        if (!landingPage) {
          return res
            .status(400)
            .json({ error: "No landing page found. Create one first." });
        }

        // Get active subscribers
        const subscribers =
          await storage.getActiveSubscribersByLandingPage(landingPage.id);

        if (subscribers.length === 0) {
          return res
            .status(400)
            .json({ error: "No active subscribers to send to" });
        }

        // Update status to sending
        await storage.updateCampaign(id, { status: "sending" });

        const baseUrl = getBaseUrl(req);

        try {
          // Build broadcast emails for each subscriber
          const broadcastEmails = subscribers.map((sub) => ({
            to: sub.email,
            subject: campaign.subject,
            htmlBody: campaign.body,
            textBody: campaign.body.replace(/<[^>]*>/g, ""),
            artistName: landingPage.artistName,
            artistSlug: landingPage.slug,
            unsubscribeUrl: `${baseUrl}/api/mailing-list/unsubscribe/${sub.id}`,
          }));

          // Send the campaign via Postmark
          const sendResult = await sendBroadcastBatch(broadcastEmails);

          // Create email_sends records to track delivery
          const emailSends = subscribers.map((sub, idx) => ({
            campaignId: id,
            subscriberId: sub.id,
            postmarkMessageId: sendResult.results[idx]?.messageId || null,
            status: sendResult.results[idx]?.success ? "sent" as const : "failed" as const,
            sentAt: sendResult.results[idx]?.success ? new Date() : null,
          }));

          await storage.createEmailSendsBatch(emailSends);

          // Update campaign as sent
          await storage.updateCampaign(id, {
            status: "sent",
            sentAt: new Date(),
            recipientCount: subscribers.length,
          });

          return res.json({
            success: true,
            recipientCount: subscribers.length,
            sent: sendResult.sent,
            failed: sendResult.failed,
          });
        } catch (sendError) {
          // Mark campaign as failed if sending fails
          await storage.updateCampaign(id, { status: "failed" });
          console.error("[Mailing List] Send campaign error:", sendError);
          return res.status(500).json({ error: "Failed to send campaign" });
        }
      } catch (error) {
        console.error("[Mailing List] Send campaign error:", error);
        return res.status(500).json({ error: "Failed to send campaign" });
      }
    }
  );

  // 12. POST /api/mailing-list/campaigns/:id/schedule — Schedule a campaign
  app.post(
    "/api/mailing-list/campaigns/:id/schedule",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const { scheduledFor } = req.body;

        if (!scheduledFor) {
          return res
            .status(400)
            .json({ error: "scheduledFor date is required" });
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
          return res
            .status(400)
            .json({ error: "Invalid date format for scheduledFor" });
        }

        if (scheduledDate <= new Date()) {
          return res
            .status(400)
            .json({ error: "Scheduled date must be in the future" });
        }

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (campaign.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Can only schedule draft campaigns" });
        }

        const updated = await storage.updateCampaign(id, {
          status: "scheduled",
          scheduledFor: scheduledDate,
        });

        return res.json({ campaign: updated });
      } catch (error) {
        console.error("[Mailing List] Schedule campaign error:", error);
        return res.status(500).json({ error: "Failed to schedule campaign" });
      }
    }
  );

  // 13. POST /api/mailing-list/campaigns/:id/cancel-schedule — Cancel a scheduled campaign
  app.post(
    "/api/mailing-list/campaigns/:id/cancel-schedule",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        if (campaign.status !== "scheduled") {
          return res
            .status(400)
            .json({ error: "Can only cancel scheduled campaigns" });
        }

        const updated = await storage.updateCampaign(id, {
          status: "draft",
          scheduledFor: null,
        });

        return res.json({ campaign: updated });
      } catch (error) {
        console.error(
          "[Mailing List] Cancel schedule error:",
          error
        );
        return res
          .status(500)
          .json({ error: "Failed to cancel scheduled campaign" });
      }
    }
  );

  // 14. GET /api/mailing-list/campaigns/:id/analytics — Get campaign analytics
  app.get(
    "/api/mailing-list/campaigns/:id/analytics",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const campaign = await storage.getCampaign(id);
        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }

        const [analytics, linkClicks] = await Promise.all([
          storage.getCampaignAnalytics(id),
          storage.getLinkClicksByCampaign(id),
        ]);

        return res.json({ analytics, linkClicks });
      } catch (error) {
        console.error("[Mailing List] Get analytics error:", error);
        return res.status(500).json({ error: "Failed to get analytics" });
      }
    }
  );

  // ============================================
  // POSTMARK WEBHOOK
  // ============================================

  // 15. POST /api/webhooks/postmark — Handle Postmark delivery/bounce/open/click events
  app.post(
    "/api/webhooks/postmark",
    async (req: Request, res: Response) => {
      try {
        const event = req.body;

        if (!event || !event.RecordType) {
          return res.status(400).json({ error: "Invalid webhook payload" });
        }

        const postmarkMessageId = event.MessageID;
        if (!postmarkMessageId) {
          // Not all events have a MessageID; acknowledge anyway
          return res.json({ success: true });
        }

        const emailSend =
          await storage.getEmailSendByPostmarkId(postmarkMessageId);

        if (!emailSend) {
          // Unknown message ID - could be a non-campaign email; acknowledge
          return res.json({ success: true });
        }

        switch (event.RecordType) {
          case "Delivery": {
            await storage.updateEmailSend(emailSend.id, {
              status: "delivered",
            });
            break;
          }

          case "Bounce": {
            await storage.updateEmailSend(emailSend.id, {
              status: "bounced",
            });

            // Hard bounce: unsubscribe the subscriber
            if (event.Type === "HardBounce") {
              const subscriber = await storage.getSubscriber(
                emailSend.subscriberId
              );
              if (subscriber && subscriber.status !== "unsubscribed") {
                await storage.updateSubscriber(subscriber.id, {
                  status: "unsubscribed",
                  unsubscribedAt: new Date(),
                });
              }
            }
            break;
          }

          case "Open": {
            // Only set openedAt if not already set
            if (!emailSend.openedAt) {
              await storage.updateEmailSend(emailSend.id, {
                openedAt: new Date(),
              });
            }
            break;
          }

          case "Click": {
            // Only set clickedAt if not already set
            if (!emailSend.clickedAt) {
              await storage.updateEmailSend(emailSend.id, {
                clickedAt: new Date(),
              });
            }

            // Record the link click
            const clickUrl = event.OriginalLink || event.Url || "";
            if (clickUrl) {
              await storage.createLinkClick({
                sendId: emailSend.id,
                url: clickUrl,
              });
            }
            break;
          }

          default:
            // Unknown event type; acknowledge
            break;
        }

        return res.json({ success: true });
      } catch (error) {
        console.error("[Mailing List] Postmark webhook error:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}
