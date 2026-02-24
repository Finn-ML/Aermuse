import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertContractSchema, insertLandingPageSchema, insertLandingPageLinkSchema, insertMerchProductSchema, insertMerchVariantSchema } from "@shared/schema";
import { validateFormData, renderTemplateContent, generateHTML, generateText, assignFieldGroups } from "./services/templateRenderer";
import { validateTemplateStructure } from "./services/templateValidation";
import type { TemplateFormData, TemplateField, OptionalClause, TemplateContent } from "@shared/types/templates";
import { z } from "zod";
import { hashPassword, comparePassword, generateSecureToken } from "./lib/auth";
import { validatePassword } from "@shared/passwordValidation";
import { authLimiter, aiLimiter } from "./middleware/rateLimit";
import { sendPasswordResetEmail, sendVerificationEmail, sendAccountDeletionEmail, sendProposalNotificationEmail, sendPurchaseReceiptEmail, sendTrackSoldNotificationEmail, sendVideoPurchaseReceiptEmail, sendVideoSoldNotificationEmail } from "./services/postmark";
import rateLimit from "express-rate-limit";
import { requireAdmin, requireAuth, requirePremium } from "./middleware/auth";
import { requireFeature } from "./middleware/tier";
import { canAccessFeature } from "@shared/constants/tiers";
import type { SubscriptionTier } from "@shared/schema";
import multer from "multer";
import { upload, verifyFileType, imageUpload, backgroundImageUpload, audioUpload, verifyAudioType, coverArtUpload, proposalContractUpload, videoUpload, verifyVideoType } from "./middleware/upload";
import { uploadContractFile, downloadContractFile, getContentType, uploadSignedPdf, uploadBackgroundImage, downloadBackgroundImage, getImageContentType, uploadAvatarImage, downloadAvatarImage, uploadTrackAudio, uploadTrackPreview, uploadTrackCover, downloadTrackFile, deleteTrackFiles, getAudioContentType, uploadProposalContract, downloadProposalContract, uploadBackgroundVideo, uploadBackgroundVideoPoster, downloadBackgroundVideo, deleteBackgroundVideoFiles, getVideoContentType, StorageError, uploadArtistVideo, uploadArtistVideoPreview, uploadArtistVideoThumbnail, downloadArtistVideoFile, downloadArtistVideoToFile, deleteArtistVideoFiles, uploadMerchImage, downloadMerchImage, deleteMerchImage } from "./services/fileStorage";
import { getAudioMetadata, generatePreview } from "./services/audioProcessor";
import { processCanvasVideo } from "./services/videoProcessor";
import { createTrackProduct, updateTrackPrice as updateTrackPriceStripe, archiveTrackProduct, createTrackCheckoutSession, getCheckoutSession as getCheckoutSessionStripe, extractTrackPurchaseDetails, createSplitTransfers, createVideoCheckoutSession, extractVideoPurchaseDetails } from "./services/trackStripe";
import { createConnectAccount, createAccountLink, getAccountStatus, createLoginLink, isAccountReady, connectConfig, calculatePlatformFee } from "./services/stripeConnect";
import { stripe } from "./services/stripe";
import { extractText, truncateForAI } from "./services/extraction";
import { analyzeContract, generateSpeech, OpenAIError, parseContractFields, type ParsedContractFields } from "./services/openai";
import { generateAermuseContract } from "./services/contractGenerator";
import { getUserSubscription, canCreateContract } from "./services/subscription";
import { FREE_TIER_LIMITS } from "@shared/types/subscription";
import { generateContractPdf, sanitizeFilename, generateContractPDFWithSignatureAreas } from "./services/pdfGenerator";
import { getDocuSealService, DocuSealServiceError } from "./services/docuseal";
import { logAdminActivity, getActivityLogs, getAvailableActions, getActiveAdmins } from "./services/adminActivity";
import { signatureRequests, signatories, insertSignatureRequestSchema, insertSignatorySchema, proposals, PROPOSAL_TYPES, systemSettings, aiUsage, contracts, users, trackSplits, contractTemplates } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count, sql, gte, isNull } from "drizzle-orm";
import crypto from "crypto";
import { sendSignatureRequestEmail, sendSignatureReminderEmail, sendSignatureCancelledEmail, sendSignatureConfirmationEmail, sendDocumentCompletedEmail } from "./services/postmark";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerMailingListRoutes } from "./routes/mailing-list";
import { registerVentureApiRoutes } from "./routes/ventureApi";

// Rate limiter for resend verification (1 per 5 minutes)
const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1,
  message: { error: 'Please wait 5 minutes before requesting another verification email' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for proposal submissions (5 per hour per IP)
const proposalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 proposals per hour per IP
  message: { error: 'Too many proposals submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Get the base URL from the request for constructing email links.
 * Uses the Origin header, X-Forwarded-Host, or Host header to dynamically
 * adapt to dev/production domains.
 */
function getBaseUrl(req: Request): string {
  // Try Origin header first (set by browsers on same-origin requests)
  const origin = req.get('origin');
  if (origin) {
    return origin;
  }

  // Fall back to constructing from host
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');

  if (host) {
    return `${protocol}://${host}`;
  }

  // Last resort fallback
  return process.env.APP_URL || 'http://localhost:5000';
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register analytics routes (Epic 10)
  registerAnalyticsRoutes(app);

  // Register mailing list routes (Mailing List Feature)
  registerMailingListRoutes(app);

  // Register VentureAPI routes (external metrics API)
  registerVentureApiRoutes(app);

  // SEO routes
  app.get("/robots.txt", (_req: Request, res: Response) => {
    const robotsTxt = `User-agent: *
Allow: /artist/
Disallow: /dashboard
Disallow: /api/
Disallow: /admin

Sitemap: ${getBaseUrl(_req)}/sitemap.xml
`;
    res.type('text/plain').send(robotsTxt);
  });

  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
      const baseUrl = getBaseUrl(req);
      const publishedPages = await storage.getAllPublishedLandingPages();

      const urls = publishedPages.map(page => {
        const lastmod = page.updatedAt ? new Date(page.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        return `  <url>
    <loc>${baseUrl}/artist/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }).join('\n');

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

      res.type('application/xml').send(sitemap);
    } catch (error) {
      console.error('[SEO] Sitemap generation error:', error);
      res.status(500).type('text/plain').send('Error generating sitemap');
    }
  });

  // Auth routes

  // Dev login - creates/logs in a theta test account (development only)
  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    try {
      const devEmail = "dev-theta@aermuse.com";
      let user = await storage.getUserByEmail(devEmail);

      if (!user) {
        const hashedPw = await hashPassword("DevTheta123!");
        user = await storage.createUser({
          email: devEmail,
          password: hashedPw,
          name: "Theta Dev Artist",
          artistName: "Theta Dev Artist",
          avatarInitials: "TD",
          emailVerified: true,
          subscriptionTier: "theta",
        } as any);

        // Create landing page for the dev user
        await storage.createLandingPage({
          userId: user.id,
          slug: `theta-dev-${user.id.slice(0, 8)}`,
          artistName: "Theta Dev Artist",
          tagline: "Testing Merch Store",
          bio: "A test artist account for development.",
          socialLinks: JSON.stringify([]),
          isPublished: true,
        });
      }

      // Ensure theta tier
      if (user.subscriptionTier !== "theta") {
        await storage.updateUser(user.id, { subscriptionTier: "theta" } as any);
      }

      (req.session as any).userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json({ user: { ...safeUser, subscriptionTier: "theta" } });
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);

      // Validate password strength
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.errors[0] });
      }

      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        if (existingUser.deletedAt) {
          return res.status(400).json({
            error: "This email was recently used for a deleted account. Please wait 30 days or contact support."
          });
        }
        return res.status(400).json({ error: "Email already in use" });
      }

      const hashedPassword = await hashPassword(data.password);
      const verificationToken = generateSecureToken();

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        avatarInitials: data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        emailVerified: false,
        emailVerificationToken: verificationToken,
      } as any);

      // Send verification email (fire and forget)
      sendVerificationEmail(user.email, verificationToken, user.name, getBaseUrl(req)).catch((err) => {
        console.error("[AUTH] Failed to send verification email:", err);
      });

      console.log(`[AUTH] Registration: verification email sent to ${user.email}`);

      // Create default landing page for user
      const slug = data.artistName 
        ? data.artistName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        : data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      
      await storage.createLandingPage({
        userId: user.id,
        slug: `${slug}-${user.id.slice(0, 8)}`,
        artistName: data.artistName || data.name,
        tagline: "Independent Artist",
        bio: "",
        socialLinks: JSON.stringify([]),
        isPublished: false,
      });

      // Link pending signatories by email (producer license agreements)
      try {
        const userEmail = data.email.toLowerCase();
        await db.update(signatories)
          .set({ userId: user.id })
          .where(and(eq(signatories.email, userEmail), isNull(signatories.userId)));

        await db.update(trackSplits)
          .set({ collaboratorUserId: user.id })
          .where(and(eq(trackSplits.collaboratorEmail, userEmail), isNull(trackSplits.collaboratorUserId)));
      } catch (linkError) {
        console.error("[AUTH] Failed to link pending signatories/splits on registration:", linkError);
      }

      // Set session
      (req.session as any).userId = user.id;

      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if account is soft-deleted
      if (user.deletedAt) {
        return res.status(401).json({ error: "This account has been deleted" });
      }

      // Compare password with migration support for legacy SHA-256 hashes
      const passwordValid = await comparePassword(password, user.password, user.id);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;

      // Track last login time for VentureAPI active user metrics
      await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);

      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Dev-only quick login for test accounts (skips password check)
  if (process.env.NODE_ENV !== 'production') {
    app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserByEmail('dev-theta@aermuse.com');
        if (!user) {
          return res.status(404).json({ error: "Dev theta account not found. Restart server to seed." });
        }
        (req.session as any).userId = user.id;
        const { password: _, ...safeUser } = user;
        res.json({ user: safeUser });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ error: "Failed to dev login" });
      }
    });
  }

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Password Reset Flow
  app.post("/api/auth/forgot-password", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists, a reset email has been sent." });
      }

      // Generate token and set expiry (1 hour)
      const token = generateSecureToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        passwordResetToken: token,
        passwordResetExpires: expires,
      } as any);

      // Send email (fire and forget, don't fail the request)
      sendPasswordResetEmail(user.email, token, user.name, getBaseUrl(req)).catch((err) => {
        console.error("[AUTH] Failed to send password reset email:", err);
      });

      console.log(`[AUTH] Password reset requested for ${user.email}`);
      res.json({ message: "If an account exists, a reset email has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Reset token is required" });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password || '');
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.errors[0] });
      }

      // Find user with valid, non-expired token
      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password and clear reset token
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      } as any);

      console.log(`[AUTH] Password reset completed for user ${user.id}`);
      res.json({ success: true, message: "Password has been reset. Please log in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Email Verification Flow
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      if (user.emailVerified) {
        return res.json({ success: true, message: "Email already verified" });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
      } as any);

      console.log(`[AUTH] Email verified for user ${user.id}`);
      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", resendLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email already verified" });
      }

      const verificationToken = generateSecureToken();

      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
      } as any);

      await sendVerificationEmail(user.email, verificationToken, user.name, getBaseUrl(req));

      console.log(`[AUTH] Verification email resent to ${user.email}`);
      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Change Password (from Settings)
  app.patch("/api/auth/password", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      // Validate password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.errors[0] });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const passwordValid = await comparePassword(currentPassword, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash and save new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword } as any);

      console.log(`[AUTH] Password changed for user ${user.id}`);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Account Deletion (Soft Delete)
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify password before deletion
      const passwordValid = await comparePassword(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // Soft delete - set deletedAt timestamp
      await storage.updateUser(user.id, { deletedAt: new Date() } as any);

      console.log(`[AUTH] Account soft deleted for user ${user.id}`);

      // Send confirmation email (fire and forget)
      sendAccountDeletionEmail(user.email, user.name).catch((err) => {
        console.error("[AUTH] Failed to send account deletion email:", err);
      });

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("[AUTH] Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Account scheduled for deletion" });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Contract limit status endpoint (for pay gating UI)
  app.get("/api/contracts/limit", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limitCheck = await canCreateContract(userId);
      res.json({
        current: limitCheck.current,
        limit: limitCheck.limit,
        allowed: limitCheck.allowed,
        isPremium: !limitCheck.limit // No limit means premium
      });
    } catch (error) {
      console.error("Get contract limit error:", error);
      res.status(500).json({ error: "Failed to get contract limit" });
    }
  });

  // Upcoming events endpoint for dashboard widget
  app.get("/api/upcoming-events", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const events: Array<{
        id: string;
        title: string;
        date: string;
        type: 'contract' | 'signature' | 'payment';
      }> = [];

      // 1. Contract expiry dates (within next 30 days)
      const expiringContracts = await storage.getContractsByUser(userId);
      for (const contract of expiringContracts) {
        if (contract.expiryDate) {
          const expiry = new Date(contract.expiryDate);
          if (expiry >= now && expiry <= thirtyDaysFromNow) {
            events.push({
              id: `contract-${contract.id}`,
              title: `${contract.name} expires`,
              date: expiry.toISOString(),
              type: 'contract',
            });
          }
        }
      }

      // 2. Pending signature requests (expiring within 30 days)
      const pendingSignatures = await db
        .select()
        .from(signatureRequests)
        .where(
          and(
            eq(signatureRequests.initiatorId, userId),
            or(
              eq(signatureRequests.status, 'pending'),
              eq(signatureRequests.status, 'in_progress')
            )
          )
        );

      for (const sig of pendingSignatures) {
        if (sig.expiresAt) {
          const expiry = new Date(sig.expiresAt);
          if (expiry >= now && expiry <= thirtyDaysFromNow) {
            // Get contract name
            const contract = await storage.getContract(sig.contractId);
            events.push({
              id: `signature-${sig.id}`,
              title: `Signature due: ${contract?.name || 'Contract'}`,
              date: expiry.toISOString(),
              type: 'signature',
            });
          }
        }
      }

      // 3. Subscription renewal (if premium)
      const user = await storage.getUser(userId);
      if (user?.subscriptionCurrentPeriodEnd && (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing')) {
        const renewalDate = new Date(user.subscriptionCurrentPeriodEnd);
        if (renewalDate >= now && renewalDate <= thirtyDaysFromNow) {
          events.push({
            id: `payment-subscription`,
            title: user.subscriptionCancelAtPeriodEnd ? 'Subscription ends' : 'Subscription renews',
            date: renewalDate.toISOString(),
            type: 'payment',
          });
        }
      }

      // Sort by date ascending
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Return top 5
      res.json({ events: events.slice(0, 5) });
    } catch (error) {
      console.error("Get upcoming events error:", error);
      res.status(500).json({ error: "Failed to get upcoming events" });
    }
  });

  // Contracts routes
  app.get("/api/contracts", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Extract filter and sort parameters (Story 8.6)
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        folderId: req.query.folderId as string | undefined,
        sortField: (req.query.sortField as string | undefined) || 'updatedAt',
        sortOrder: (req.query.sortOrder as string | undefined) || 'desc',
      };

      // Always use filterContracts since it handles sorting (Story 8.6)
      const contracts = await storage.filterContracts(userId, filters as any);

      res.json(contracts);
    } catch (error) {
      console.error("Get contracts error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  app.get("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      res.json({ contract });
    } catch (error) {
      console.error("Get contract error:", error);
      res.status(500).json({ error: "Failed to get contract" });
    }
  });

  app.post("/api/contracts", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check contract limit for free users
      const limitCheck = await canCreateContract(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: "Contract limit reached. Upgrade to Premium for unlimited contracts.",
          code: "CONTRACT_LIMIT_REACHED",
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeUrl: "/pricing"
        });
      }

      const data = insertContractSchema.parse({
        ...req.body,
        userId,
      });

      const contract = await storage.createContract(data);
      res.json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create contract error:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.patch("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const updatedContract = await storage.updateContract(req.params.id, req.body);
      res.json(updatedContract);
    } catch (error) {
      console.error("Update contract error:", error);
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      await storage.deleteContract(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contract error:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  });

  // Sign contract
  app.post("/api/contracts/:id/sign", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const updatedContract = await storage.updateContract(req.params.id, {
        status: "active",
        signedAt: new Date(),
      });

      res.json(updatedContract);
    } catch (error) {
      console.error("Sign contract error:", error);
      res.status(500).json({ error: "Failed to sign contract" });
    }
  });

  // Helper to check and track AI usage
  async function checkAndTrackAiUsage(userId: string): Promise<{ allowed: boolean; used: number; limit: number; error?: string }> {
    const user = await storage.getUser(userId);
    if (!user) {
      return { allowed: false, used: 0, limit: 0, error: "User not found" };
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current usage
    const [usage] = await db.select()
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        gte(aiUsage.usageDate, today)
      ));

    const currentCount = usage?.analysisCount ?? 0;

    // Get daily limit from settings
    const isPremium = user.plan === 'premium' || user.subscriptionStatus === 'active';
    const limitKey = isPremium ? 'ai.daily_limit_premium' : 'ai.daily_limit_free';

    const [limitSetting] = await db.select().from(systemSettings).where(eq(systemSettings.key, limitKey));
    const dailyLimit = (limitSetting?.value as number) ?? (isPremium ? 100 : 0);

    // Check if limit reached
    if (dailyLimit > 0 && currentCount >= dailyLimit) {
      return {
        allowed: false,
        used: currentCount,
        limit: dailyLimit,
        error: `Daily AI analysis limit reached (${dailyLimit}/${dailyLimit}). ${isPremium ? 'Try again tomorrow.' : 'Upgrade to Premium for more analyses.'}`
      };
    }

    // No limit set means no access for free users
    if (dailyLimit === 0 && !isPremium) {
      return {
        allowed: false,
        used: currentCount,
        limit: dailyLimit,
        error: "AI analysis requires a Premium subscription."
      };
    }

    return { allowed: true, used: currentCount, limit: dailyLimit };
  }

  // Helper to increment AI usage after successful analysis
  async function incrementAiUsage(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existing] = await db.select()
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        gte(aiUsage.usageDate, today)
      ));

    if (existing) {
      await db.update(aiUsage)
        .set({
          analysisCount: existing.analysisCount + 1,
          updatedAt: new Date()
        })
        .where(eq(aiUsage.id, existing.id));
    } else {
      await db.insert(aiUsage).values({
        userId,
        usageDate: today,
        analysisCount: 1,
      });
    }
  }

  // AI Contract Analysis (GPT-4)
  app.post("/api/contracts/:id/analyze", aiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check daily usage limit
      const usageCheck = await checkAndTrackAiUsage(userId);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          error: usageCheck.error,
          code: 'DAILY_LIMIT_REACHED',
          used: usageCheck.used,
          limit: usageCheck.limit
        });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Get text content - either from uploaded file or from template-generated content
      let contractText = contract.extractedText;

      // For template-based contracts, strip HTML from renderedContent
      if (!contractText && contract.renderedContent) {
        contractText = contract.renderedContent
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
          .replace(/<[^>]+>/g, ' ') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ') // Collapse whitespace
          .trim();
      }

      if (!contractText) {
        return res.status(400).json({
          error: 'No text available for analysis. Please upload a text-based document.'
        });
      }

      // Update status to analyzing — but preserve signature-related statuses
      const signatureStatuses = ['pending_signature', 'signed'];
      if (!signatureStatuses.includes(contract.status)) {
        await storage.updateContract(contract.id, { status: 'analyzing' });
      }

      // Truncate if needed
      const { text, truncated, originalLength } = truncateForAI(contractText);

      if (truncated) {
        console.log(`[AI] Contract ${contract.id} truncated: ${originalLength} → ${text.length} chars`);
      }

      // Perform analysis
      const result = await analyzeContract(text);

      // Add metadata to analysis
      const analysis = {
        ...result.analysis,
        metadata: {
          modelVersion: result.model,
          analyzedAt: new Date().toISOString(),
          processingTime: result.processingTime,
          tokenCount: result.usage.totalTokens,
          truncated
        }
      };

      // Determine risk score from analysis
      const overallScore = result.analysis.riskAssessment?.overallScore || 50;
      const riskScore = overallScore >= 80 ? "low" : overallScore >= 60 ? "medium" : "high";

      // Save analysis to contract
      // Fetch fresh status from DB (may have changed during analysis)
      const freshContract = await storage.getContract(contract.id);
      const currentStatus = freshContract?.status || contract.status;
      const preserveStatuses = ['pending_review', 'pending_signature', 'signed'];
      const updatedContract = await storage.updateContract(contract.id, {
        aiAnalysis: analysis,
        aiRiskScore: riskScore,
        analyzedAt: new Date(),
        analysisVersion: (contract.analysisVersion || 0) + 1,
        ...(!preserveStatuses.includes(currentStatus) ? { status: 'analyzed' } : { status: currentStatus }),
      });

      // Track usage after successful analysis
      await incrementAiUsage(userId);

      console.log(`[AI] Contract ${contract.id} analyzed: ${result.usage.totalTokens} tokens`);

      res.json({
        contract: updatedContract,
        analysis,
        usage: result.usage
      });
    } catch (error) {
      console.error("Analyze contract error:", error);

      // Reset status on failure
      try {
        await storage.updateContract(req.params.id, { status: 'uploaded' });
      } catch (e) {
        // Ignore status reset errors
      }

      if (error instanceof OpenAIError) {
        return res.status(500).json({
          error: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        error: 'AI analysis failed. Please try again.',
        code: 'ANALYSIS_FAILED'
      });
    }
  });

  // Contract Text-to-Speech - Read contract analysis aloud
  app.post("/api/contracts/:id/speech", aiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contractId = req.params.id;
      const contract = await storage.getContract(contractId);

      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (contract.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if contract has been analyzed
      if (!contract.aiAnalysis) {
        return res.status(400).json({
          error: "Contract must be analyzed before generating speech",
          code: "NOT_ANALYZED"
        });
      }

      // Build readable text from the analysis
      const analysis = contract.aiAnalysis as any;
      let textToSpeak = '';

      // Summary section
      if (analysis.summary?.overview) {
        textToSpeak += `Contract Summary. ${analysis.summary.overview} `;
      }

      if (analysis.summary?.contractType) {
        textToSpeak += `This is a ${analysis.summary.contractType}. `;
      }

      if (analysis.summary?.duration) {
        textToSpeak += `The contract duration is ${analysis.summary.duration}. `;
      }

      // Risk assessment
      if (analysis.riskAssessment) {
        const riskLevel = analysis.riskAssessment.overallRisk || 'unknown';
        textToSpeak += `Risk Assessment. The overall risk level is ${riskLevel}. `;
        if (analysis.riskAssessment.summary) {
          textToSpeak += `${analysis.riskAssessment.summary} `;
        }
      }

      // Red flags
      if (analysis.redFlags && analysis.redFlags.length > 0) {
        textToSpeak += `Red Flags. There are ${analysis.redFlags.length} potential issues to be aware of. `;
        analysis.redFlags.slice(0, 3).forEach((flag: any, index: number) => {
          textToSpeak += `Issue ${index + 1}: ${flag.issue}. ${flag.explanation} `;
        });
        if (analysis.redFlags.length > 3) {
          textToSpeak += `Plus ${analysis.redFlags.length - 3} more issues. Please review the full analysis for details. `;
        }
      }

      // Key terms (top 3)
      if (analysis.keyTerms && analysis.keyTerms.length > 0) {
        textToSpeak += `Key Terms. `;
        analysis.keyTerms.slice(0, 3).forEach((term: any) => {
          textToSpeak += `${term.term}: ${term.value}. `;
        });
      }

      if (!textToSpeak.trim()) {
        return res.status(400).json({
          error: "No analysis content available to read",
          code: "NO_CONTENT"
        });
      }

      console.log(`[TTS] Generating speech for contract ${contractId}, ${textToSpeak.length} chars`);

      // Generate speech audio
      const audioBuffer = await generateSpeech(textToSpeak);

      // Set appropriate headers for audio
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'private, max-age=3600' // Cache for 1 hour
      });

      res.send(audioBuffer);
    } catch (error: any) {
      console.error("[TTS] Speech generation error:", error);

      if (error instanceof OpenAIError) {
        return res.status(503).json({
          error: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        error: 'Failed to generate speech. Please try again.',
        code: 'TTS_FAILED'
      });
    }
  });

  // Contract File Upload
  app.post("/api/contracts/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check contract limit for free users
      const limitCheck = await canCreateContract(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: "Contract limit reached. Upgrade to Premium for unlimited contracts.",
          code: "CONTRACT_LIMIT_REACHED",
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeUrl: "/pricing"
        });
      }

      // Verify file type using magic bytes
      const verification = await verifyFileType(req.file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      // Create contract record
      const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, "");
      const contract = await storage.createContract({
        userId,
        name: title,
        type: "uploaded",
        status: "pending",
      });

      // Upload to Object Storage
      const uploaded = await uploadContractFile(
        userId,
        contract.id,
        req.file.buffer,
        verification.type!
      );

      // Extract text from document
      const extraction = await extractText(req.file.buffer, verification.type!);

      console.log(`[EXTRACT] Contract ${contract.id}: ${extraction.charCount} chars extracted`);

      // Update contract with file info and extracted text
      const updatedContract = await storage.updateContract(contract.id, {
        filePath: uploaded.path,
        fileName: req.file.originalname,
        fileSize: uploaded.size,
        fileType: verification.type,
        extractedText: extraction.text,
        status: extraction.success ? "uploaded" : "extraction_failed",
      });

      console.log(`[UPLOAD] Complete: ${contract.id} (${verification.type}, ${uploaded.size} bytes)`);

      // Return contract with extraction status
      res.json({
        contract: updatedContract,
        extraction: {
          success: extraction.success,
          charCount: extraction.charCount,
          pageCount: extraction.pageCount,
          warning: extraction.warning,
          error: extraction.error,
        },
      });
    } catch (error) {
      console.error("[UPLOAD] Failed:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  // Contract File Download
  app.get("/api/contracts/:id/download", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (!contract.filePath) {
        return res.status(404).json({ error: "No file attached to this contract" });
      }

      const buffer = await downloadContractFile(contract.filePath);

      res.setHeader("Content-Type", getContentType(contract.fileType || "pdf"));
      res.setHeader("Content-Disposition", `attachment; filename="${contract.fileName || "contract"}"`);
      res.send(buffer);
    } catch (error) {
      console.error("[DOWNLOAD] Failed:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Contract PDF Export (Story 8.4)
  app.get("/api/contracts/:id/pdf", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Generate PDF summary
      const pdfBuffer = await generateContractPdf({
        id: contract.id,
        name: contract.name,
        type: contract.type,
        status: contract.status,
        partnerName: contract.partnerName,
        value: contract.value,
        createdAt: contract.createdAt || new Date(),
        updatedAt: contract.updatedAt || new Date(),
        signedAt: contract.signedAt,
        aiRiskScore: contract.aiRiskScore,
        aiAnalysis: contract.aiAnalysis as any,
      });

      // Create safe filename
      const filename = sanitizeFilename(contract.name);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}-summary.pdf"`
      );
      res.send(pdfBuffer);

      console.log(`[PDF] Generated summary for contract ${contract.id}`);
    } catch (error) {
      console.error("[PDF] Generation failed:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Manual Re-extraction endpoint
  app.post("/api/contracts/:id/extract", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (!contract.filePath) {
        return res.status(404).json({ error: "No file attached to this contract" });
      }

      // Download file from storage
      const buffer = await downloadContractFile(contract.filePath);

      // Extract text
      const extraction = await extractText(buffer, contract.fileType!);

      console.log(`[EXTRACT] Re-extraction for ${contract.id}: ${extraction.charCount} chars`);

      // Update contract
      await storage.updateContract(contract.id, {
        extractedText: extraction.text,
        status: extraction.success ? "uploaded" : "extraction_failed",
      });

      res.json({
        success: extraction.success,
        charCount: extraction.charCount,
        pageCount: extraction.pageCount,
        warning: extraction.warning,
        error: extraction.error,
      });
    } catch (error) {
      console.error("[EXTRACT] Re-extraction failed:", error);
      res.status(500).json({ error: "Text extraction failed" });
    }
  });

  // Contract Version History (Story 8.5)
  app.get("/api/contracts/:id/versions", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const versions = await storage.getContractVersions(req.params.id);
      const currentVersion = versions.length + 1;

      res.json({ versions, currentVersion });
    } catch (error) {
      console.error("Get versions error:", error);
      res.status(500).json({ error: "Failed to get versions" });
    }
  });

  // Contract Versions - Get specific version
  app.get("/api/contracts/:id/versions/:versionId", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const version = await storage.getContractVersion(req.params.versionId);
      if (!version || version.contractId !== req.params.id) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.json({ version });
    } catch (error) {
      console.error("Get contract version error:", error);
      res.status(500).json({ error: "Failed to get version" });
    }
  });

  // Contract Versions - Download version file
  app.get("/api/contracts/:id/versions/:versionId/download", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const version = await storage.getContractVersion(req.params.versionId);
      if (!version || version.contractId !== req.params.id) {
        return res.status(404).json({ error: "Version not found" });
      }

      if (!version.filePath) {
        return res.status(404).json({ error: "No file attached to this version" });
      }

      const buffer = await downloadContractFile(version.filePath);

      res.setHeader("Content-Type", getContentType(version.fileType || "pdf"));
      res.setHeader("Content-Disposition", `attachment; filename="${version.fileName || "contract"}"`);
      res.send(buffer);
    } catch (error) {
      console.error("[VERSION DOWNLOAD] Failed:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Contract Versions - Upload new version
  app.post("/api/contracts/:id/versions", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Verify file type using magic bytes
      const verification = await verifyFileType(req.file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      // Archive current version before updating
      const currentVersionNumber = await storage.getLatestVersionNumber(contract.id);

      // Only archive if there's existing file data
      if (contract.filePath) {
        await storage.createContractVersion({
          contractId: contract.id,
          versionNumber: currentVersionNumber + 1,
          fileName: contract.fileName,
          filePath: contract.filePath,
          fileSize: contract.fileSize,
          fileType: contract.fileType,
          extractedText: contract.extractedText,
          aiAnalysis: contract.aiAnalysis as Record<string, unknown> | null,
          aiRiskScore: contract.aiRiskScore,
          analyzedAt: contract.analyzedAt,
          notes: req.body.notes || null,
        });
      }

      // Upload new file to Object Storage
      const newVersionNumber = currentVersionNumber + 2;
      const uploaded = await uploadContractFile(
        userId,
        contract.id,
        req.file.buffer,
        verification.type!,
        `v${newVersionNumber}`
      );

      // Extract text from new document
      const extraction = await extractText(req.file.buffer, verification.type!);

      console.log(`[VERSION] Contract ${contract.id} v${newVersionNumber}: ${extraction.charCount} chars extracted`);

      // Update main contract with new file
      const updatedContract = await storage.updateContract(contract.id, {
        filePath: uploaded.path,
        fileName: req.file.originalname,
        fileSize: uploaded.size,
        fileType: verification.type,
        extractedText: extraction.text,
        aiAnalysis: null, // Clear previous analysis
        aiRiskScore: null,
        analyzedAt: null,
        status: extraction.success ? "uploaded" : "extraction_failed",
      });

      console.log(`[VERSION] New version uploaded: ${contract.id} v${newVersionNumber}`);

      res.json({
        contract: updatedContract,
        versionNumber: newVersionNumber,
        extraction: {
          success: extraction.success,
          charCount: extraction.charCount,
          pageCount: extraction.pageCount,
          warning: extraction.warning,
          error: extraction.error,
        },
      });
    } catch (error) {
      console.error("[VERSION UPLOAD] Failed:", error);
      res.status(500).json({ error: "Version upload failed" });
    }
  });


  // Multer error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Maximum size: 10MB" });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes("Invalid file type")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });

  // Contract Folders routes (Story 8.3)
  app.get("/api/folders", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const data = await storage.getFolderWithCounts(userId);
      res.json(data);
    } catch (error) {
      console.error("Get folders error:", error);
      res.status(500).json({ error: "Failed to get folders" });
    }
  });

  app.post("/api/folders", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, color } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Folder name is required" });
      }

      // Validate color format if provided
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ error: "Invalid color format. Use hex: #RRGGBB" });
      }

      // Check for duplicate name
      const existingFolders = await storage.getFoldersByUser(userId);
      if (existingFolders.some(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
        return res.status(400).json({ error: "Folder name already exists" });
      }

      const folder = await storage.createFolder({
        userId,
        name: name.trim(),
        color: color || null,
        sortOrder: existingFolders.length,
      });

      res.status(201).json(folder);
    } catch (error) {
      console.error("Create folder error:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.patch("/api/folders/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ error: "Folder not found" });
      }

      const { name, color } = req.body;

      // Validate name if provided
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "Folder name cannot be empty" });
        }

        // Check for duplicate name (excluding current folder)
        const existingFolders = await storage.getFoldersByUser(userId);
        if (existingFolders.some(f => f.id !== req.params.id && f.name.toLowerCase() === name.trim().toLowerCase())) {
          return res.status(400).json({ error: "Folder name already exists" });
        }
      }

      // Validate color format if provided
      if (color !== undefined && color !== null && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ error: "Invalid color format. Use hex: #RRGGBB" });
      }

      const updated = await storage.updateFolder(req.params.id, {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      });

      res.json(updated);
    } catch (error) {
      console.error("Update folder error:", error);
      res.status(500).json({ error: "Failed to update folder" });
    }
  });

  app.delete("/api/folders/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ error: "Folder not found" });
      }

      // Check if folder has contracts
      const contractCount = await storage.getFolderContractCount(req.params.id);
      if (contractCount > 0) {
        return res.status(400).json({
          error: "Cannot delete folder with contracts. Move or delete contracts first."
        });
      }

      await storage.deleteFolder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete folder error:", error);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  app.post("/api/contracts/:id/move", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const { folderId } = req.body;

      // Verify folder belongs to user if provided
      if (folderId) {
        const folder = await storage.getFolder(folderId);
        if (!folder || folder.userId !== userId) {
          return res.status(404).json({ error: "Folder not found" });
        }
      }

      await storage.moveContractToFolder(req.params.id, folderId || null);
      res.json({ success: true });
    } catch (error) {
      console.error("Move contract error:", error);
      res.status(500).json({ error: "Failed to move contract" });
    }
  });

  // Theme Presets (Epic 9) - public endpoint
  app.get("/api/themes", async (_req: Request, res: Response) => {
    try {
      const { THEME_PRESETS } = await import("@shared/themes");
      res.json(THEME_PRESETS);
    } catch (error) {
      console.error("Get themes error:", error);
      res.status(500).json({ error: "Failed to get themes" });
    }
  });

  // Landing Page routes
  app.get("/api/landing-page", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const page = await storage.getLandingPageByUser(userId);
      if (!page) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const links = await storage.getLandingPageLinks(page.id);
      res.json({ ...page, links });
    } catch (error) {
      console.error("Get landing page error:", error);
      res.status(500).json({ error: "Failed to get landing page" });
    }
  });

  app.patch("/api/landing-page", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const page = await storage.getLandingPageByUser(userId);
      if (!page) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const updatedPage = await storage.updateLandingPage(page.id, req.body);
      res.json(updatedPage);
    } catch (error) {
      console.error("Update landing page error:", error);
      res.status(500).json({ error: "Failed to update landing page" });
    }
  });

  // Public landing page (no auth required)
  app.get("/api/artist/:slug", async (req: Request, res: Response) => {
    try {
      const page = await storage.getLandingPageBySlug(req.params.slug);
      if (!page || !page.isPublished) {
        return res.status(404).json({ error: "Artist page not found" });
      }

      const links = await storage.getLandingPageLinks(page.id);
      res.json({ ...page, links });
    } catch (error) {
      console.error("Get artist page error:", error);
      res.status(500).json({ error: "Failed to get artist page" });
    }
  });

  // Landing Page Links routes
  app.post("/api/landing-page/links", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const page = await storage.getLandingPageByUser(userId);
      if (!page) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const data = insertLandingPageLinkSchema.parse({
        ...req.body,
        landingPageId: page.id,
      });

      const link = await storage.createLandingPageLink(data);
      res.json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create link error:", error);
      res.status(500).json({ error: "Failed to create link" });
    }
  });

  app.patch("/api/landing-page/links/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updatedLink = await storage.updateLandingPageLink(req.params.id, req.body);
      res.json(updatedLink);
    } catch (error) {
      console.error("Update link error:", error);
      res.status(500).json({ error: "Failed to update link" });
    }
  });

  app.delete("/api/landing-page/links/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.deleteLandingPageLink(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete link error:", error);
      res.status(500).json({ error: "Failed to delete link" });
    }
  });

  // Background image upload for landing pages (Story 9.5, 9.13: increased to 5MB)
  app.post("/api/landing-page/background-image", backgroundImageUpload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get landing page
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Get file extension
      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';

      // Upload to storage
      const result = await uploadBackgroundImage(userId, landingPage.id, file.buffer, extension);

      // Return URL path that will be served through our API
      const url = `/api/landing-page/background-image/${encodeURIComponent(result.path)}`;

      res.json({ success: true, url, path: result.path });
    } catch (error) {
      console.error("Background image upload error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
        }
      }
      res.status(500).json({ error: "Failed to upload background image" });
    }
  });

  // Serve background images
  app.get("/api/landing-page/background-image/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);

      // Extract extension for content type
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';

      const buffer = await downloadBackgroundImage(filePath);

      res.set('Content-Type', getImageContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.send(buffer);
    } catch (error) {
      console.error("Background image download error:", error);
      res.status(404).json({ error: "Image not found" });
    }
  });

  // Delete background image (Story 9.13)
  app.delete("/api/landing-page/background-image", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get landing page using storage helper
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Clear background value and set to solid color (don't delete file from storage - may be used for recovery)
      await storage.updateLandingPage(landingPage.id, {
        backgroundType: 'solid',
        backgroundValue: '#660033',
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Background image delete error:", error);
      res.status(500).json({ error: "Failed to remove background image" });
    }
  });

  // ============================================
  // BACKGROUND VIDEO UPLOAD (Spotify Canvas Style)
  // ============================================

  // In-memory store for chunked background video uploads
  const bgVideoChunkedUploads = new Map<string, {
    userId: string;
    landingPageId: string;
    chunks: Buffer[];
    totalChunks: number;
    receivedChunks: number;
    fileName: string;
    fileFormat: string;
    createdAt: Date;
  }>();

  // Clean up stale background video uploads (older than 1 hour)
  setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [uploadId, upload] of Array.from(bgVideoChunkedUploads.entries())) {
      if (upload.createdAt < oneHourAgo) {
        bgVideoChunkedUploads.delete(uploadId);
        console.log(`[VIDEO] Cleaned up stale chunked upload: ${uploadId}`);
      }
    }
  }, 5 * 60 * 1000);

  // Upload background video (mp4, mov) - converts to webm for smooth playback
  app.post("/api/landing-page/background-video", (req: Request, res: Response, next) => {
    // Extend timeout for large video uploads + FFmpeg processing
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000);
    videoUpload.single("video")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: "File too large. Maximum video size is 500MB." });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const sizeMB = req.file ? (req.file.size / (1024 * 1024)).toFixed(1) : '0';
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        console.warn(`[VIDEO] Upload rejected: not authenticated`);
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = req.file;
      if (!file) {
        console.warn(`[VIDEO] Upload rejected: no file provided (user ${userId})`);
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[VIDEO] Upload started: user=${userId}, file="${file.originalname}", size=${sizeMB}MB, mime=${file.mimetype}`);

      // Get landing page using storage helper
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        console.warn(`[VIDEO] Upload rejected: no landing page found (user ${userId})`);
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Verify video type using magic bytes
      const verification = await verifyVideoType(file.buffer);
      if (!verification.valid) {
        console.warn(`[VIDEO] Upload rejected: invalid video type (user ${userId}, error: ${verification.error})`);
        return res.status(400).json({ error: verification.error || "Invalid video file" });
      }

      const inputFormat = verification.type as 'mp4' | 'mov' | 'webm';

      console.log(`[VIDEO] Verified format: ${inputFormat}, starting FFmpeg conversion (user ${userId}, ${sizeMB}MB)`);
      const conversionStart = Date.now();

      // Process video - convert to webm with mp4 fallback + poster frame
      const { webm, mp4, poster } = await processCanvasVideo(file.buffer, inputFormat, {
        generateFallback: true,
        quality: 'medium'
      });

      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(1);
      const webmSizeMB = (webm.buffer.length / (1024 * 1024)).toFixed(2);
      const mp4SizeMB = mp4 ? (mp4.buffer.length / (1024 * 1024)).toFixed(2) : 'n/a';
      console.log(`[VIDEO] Conversion complete in ${conversionTime}s: webm=${webmSizeMB}MB, mp4=${mp4SizeMB}MB, duration=${webm.duration}s (user ${userId})`);

      // Upload WebM (primary format)
      const uploadStart = Date.now();
      const webmResult = await uploadBackgroundVideo(userId, landingPage.id, webm.buffer, 'webm');
      const webmUrl = `/api/landing-page/background-video/${encodeURIComponent(webmResult.path)}`;
      console.log(`[VIDEO] WebM uploaded to storage (user ${userId})`);

      // Upload MP4 fallback
      let mp4Url: string | undefined;
      if (mp4) {
        const mp4Result = await uploadBackgroundVideo(userId, landingPage.id, mp4.buffer, 'mp4');
        mp4Url = `/api/landing-page/background-video/${encodeURIComponent(mp4Result.path)}`;
        console.log(`[VIDEO] MP4 fallback uploaded to storage (user ${userId})`);
      }

      // Upload poster frame for instant visual feedback
      let posterUrl: string | undefined;
      if (poster) {
        const posterResult = await uploadBackgroundVideoPoster(userId, landingPage.id, poster);
        posterUrl = `/api/landing-page/background-video/${encodeURIComponent(posterResult.path)}`;
        console.log(`[VIDEO] Poster frame uploaded to storage (user ${userId})`);
      }

      const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(1);

      // Store URLs in backgroundValue as JSON
      const backgroundVideoData = JSON.stringify({
        webm: webmUrl,
        mp4: mp4Url,
        poster: posterUrl,
        duration: webm.duration
      });

      // Update landing page with video background
      await storage.updateLandingPage(landingPage.id, {
        backgroundType: 'video',
        backgroundValue: backgroundVideoData,
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[VIDEO] Upload complete: user=${userId}, input=${sizeMB}MB, output=${webmSizeMB}MB webm + ${mp4SizeMB}MB mp4, conversion=${conversionTime}s, storage=${uploadTime}s, total=${totalTime}s`);

      res.json({
        success: true,
        webmUrl,
        mp4Url,
        duration: webm.duration
      });
    } catch (error) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[VIDEO] Upload failed after ${totalTime}s (input=${sizeMB}MB):`, error);
      res.status(500).json({ error: "Failed to upload background video" });
    }
  });

  // Initialize chunked background video upload
  app.post("/api/landing-page/background-video/init-upload", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      const { totalChunks, fileName, fileSize } = req.body;
      if (!totalChunks || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const fileFormat = fileName.split('.').pop()?.toLowerCase();
      const validFormats = ['mp4', 'webm', 'mov'];
      if (!validFormats.includes(fileFormat)) {
        return res.status(400).json({ error: `Invalid file format. Accepted: ${validFormats.join(', ')}` });
      }

      const uploadId = crypto.randomUUID();
      const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : 'unknown';

      bgVideoChunkedUploads.set(uploadId, {
        userId,
        landingPageId: landingPage.id,
        chunks: new Array(totalChunks).fill(null),
        totalChunks,
        receivedChunks: 0,
        fileName,
        fileFormat,
        createdAt: new Date(),
      });

      console.log(`[VIDEO] Chunked upload initialized: id=${uploadId}, file="${fileName}", size=${sizeMB}MB, chunks=${totalChunks} (user ${userId})`);

      res.json({ uploadId, totalChunks });
    } catch (error) {
      console.error("[VIDEO] Init chunked upload error:", error);
      res.status(500).json({ error: "Failed to initialize upload" });
    }
  });

  // Upload a background video chunk
  app.post("/api/landing-page/background-video/chunk", express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10);

      if (!uploadId || isNaN(chunkIndex)) {
        return res.status(400).json({ error: "Missing upload ID or chunk index" });
      }

      const upload = bgVideoChunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
        return res.status(400).json({ error: "Invalid chunk index" });
      }

      const chunkBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      upload.chunks[chunkIndex] = chunkBuffer;
      upload.receivedChunks++;

      console.log(`[VIDEO] Chunk ${chunkIndex + 1}/${upload.totalChunks} received for ${uploadId} (${chunkBuffer.length} bytes)`);

      res.json({
        received: upload.receivedChunks,
        total: upload.totalChunks,
        complete: upload.receivedChunks === upload.totalChunks,
      });
    } catch (error) {
      console.error("[VIDEO] Upload chunk error:", error);
      res.status(500).json({ error: "Failed to upload chunk" });
    }
  });

  // Complete chunked background video upload - reassemble, convert, store
  app.post("/api/landing-page/background-video/complete-upload", async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      // Extend timeout for FFmpeg processing
      req.setTimeout(600000);
      res.setTimeout(600000);

      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uploadId } = req.body;
      if (!uploadId) {
        return res.status(400).json({ error: "Missing upload ID" });
      }

      const upload = bgVideoChunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (upload.receivedChunks !== upload.totalChunks) {
        return res.status(400).json({
          error: `Missing chunks. Received ${upload.receivedChunks}/${upload.totalChunks}`,
        });
      }

      if (upload.chunks.some(c => c === null)) {
        return res.status(400).json({ error: "Some chunks are missing" });
      }

      // Reassemble chunks
      const completeBuffer = Buffer.concat(upload.chunks);
      const sizeMB = (completeBuffer.length / (1024 * 1024)).toFixed(1);
      console.log(`[VIDEO] Reassembled ${upload.totalChunks} chunks: ${sizeMB}MB for ${uploadId} (user ${userId})`);

      // Free chunk memory immediately
      bgVideoChunkedUploads.delete(uploadId);

      // Verify video type using magic bytes
      const verification = await verifyVideoType(completeBuffer);
      if (!verification.valid) {
        console.warn(`[VIDEO] Chunked upload rejected: invalid video type (user ${userId}, error: ${verification.error})`);
        return res.status(400).json({ error: verification.error || "Invalid video file" });
      }

      const inputFormat = verification.type as 'mp4' | 'mov' | 'webm';
      console.log(`[VIDEO] Verified format: ${inputFormat}, starting FFmpeg conversion (user ${userId}, ${sizeMB}MB)`);
      const conversionStart = Date.now();

      // Process video - convert to webm with mp4 fallback + poster frame
      const { webm, mp4, poster } = await processCanvasVideo(completeBuffer, inputFormat, {
        generateFallback: true,
        quality: 'medium'
      });

      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(1);
      const webmSizeMB = (webm.buffer.length / (1024 * 1024)).toFixed(2);
      const mp4SizeMB = mp4 ? (mp4.buffer.length / (1024 * 1024)).toFixed(2) : 'n/a';
      console.log(`[VIDEO] Conversion complete in ${conversionTime}s: webm=${webmSizeMB}MB, mp4=${mp4SizeMB}MB, duration=${webm.duration}s (user ${userId})`);

      // Upload WebM (primary format)
      const uploadStart = Date.now();
      const webmResult = await uploadBackgroundVideo(userId, upload.landingPageId, webm.buffer, 'webm');
      const webmUrl = `/api/landing-page/background-video/${encodeURIComponent(webmResult.path)}`;
      console.log(`[VIDEO] WebM uploaded to storage (user ${userId})`);

      // Upload MP4 fallback
      let mp4Url: string | undefined;
      if (mp4) {
        const mp4Result = await uploadBackgroundVideo(userId, upload.landingPageId, mp4.buffer, 'mp4');
        mp4Url = `/api/landing-page/background-video/${encodeURIComponent(mp4Result.path)}`;
        console.log(`[VIDEO] MP4 fallback uploaded to storage (user ${userId})`);
      }

      // Upload poster frame
      let posterUrl: string | undefined;
      if (poster) {
        const posterResult = await uploadBackgroundVideoPoster(userId, upload.landingPageId, poster);
        posterUrl = `/api/landing-page/background-video/${encodeURIComponent(posterResult.path)}`;
        console.log(`[VIDEO] Poster frame uploaded to storage (user ${userId})`);
      }

      const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(1);

      // Store URLs in backgroundValue as JSON
      const backgroundVideoData = JSON.stringify({
        webm: webmUrl,
        mp4: mp4Url,
        poster: posterUrl,
        duration: webm.duration
      });

      // Update landing page with video background
      await storage.updateLandingPage(upload.landingPageId, {
        backgroundType: 'video',
        backgroundValue: backgroundVideoData,
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[VIDEO] Chunked upload complete: user=${userId}, input=${sizeMB}MB, output=${webmSizeMB}MB webm + ${mp4SizeMB}MB mp4, conversion=${conversionTime}s, storage=${uploadTime}s, total=${totalTime}s`);

      res.json({
        success: true,
        webmUrl,
        mp4Url,
        duration: webm.duration
      });
    } catch (error) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[VIDEO] Chunked upload failed after ${totalTime}s:`, error);
      res.status(500).json({ error: "Failed to process background video" });
    }
  });

  // Serve background videos
  app.get("/api/landing-page/background-video/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);

      // Extract extension for content type
      const extension = filePath.split('.').pop()?.toLowerCase() || 'webm';

      const buffer = await downloadBackgroundVideo(filePath);

      res.set('Content-Type', getVideoContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.set('Accept-Ranges', 'bytes'); // Support range requests for video seeking
      res.send(buffer);
    } catch (error) {
      // Handle different error types appropriately
      if (error instanceof StorageError) {
        if (error.code === 'NOT_FOUND') {
          console.warn(`Background video not found: ${req.params.path}`);
          return res.status(404).json({ error: "Video not found" });
        }
        if (error.code === 'SERVICE_UNAVAILABLE') {
          console.error("Background video storage service unavailable:", error.message);
          return res.status(503).json({
            error: "Video service temporarily unavailable. Please try again.",
            retryable: error.retryable
          });
        }
      }

      // Unknown/unexpected error
      console.error("Background video download error:", error);
      res.status(500).json({ error: "Failed to load video" });
    }
  });

  // Delete background video
  app.delete("/api/landing-page/background-video", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get landing page using storage helper
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Delete video files from storage
      await deleteBackgroundVideoFiles(userId, landingPage.id);

      // Clear background value and set to solid color
      await storage.updateLandingPage(landingPage.id, {
        backgroundType: 'solid',
        backgroundValue: '#660033',
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Background video delete error:", error);
      res.status(500).json({ error: "Failed to remove background video" });
    }
  });

  // Avatar image upload for landing pages (Story 9.12)
  app.post("/api/landing-page/avatar", imageUpload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get landing page using storage helper
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Get file extension
      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';

      // Upload to storage
      const result = await uploadAvatarImage(userId, landingPage.id, file.buffer, extension);

      // Return URL path that will be served through our API
      const url = `/api/landing-page/avatar/${encodeURIComponent(result.path)}`;

      // Update landing page avatarUrl
      await storage.updateLandingPage(landingPage.id, { avatarUrl: url });

      res.json({ success: true, url, path: result.path });
    } catch (error) {
      console.error("Avatar upload error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 2MB." });
        }
      }
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Serve avatar images
  app.get("/api/landing-page/avatar/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);

      // Extract extension for content type
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';

      const buffer = await downloadAvatarImage(filePath);

      res.set('Content-Type', getImageContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.send(buffer);
    } catch (error) {
      console.error("Avatar download error:", error);
      res.status(404).json({ error: "Avatar not found" });
    }
  });

  // Delete avatar image
  app.delete("/api/landing-page/avatar", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get landing page using storage helper
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(404).json({ error: "Landing page not found" });
      }

      // Clear avatarUrl (don't delete file from storage - may be used for recovery)
      await storage.updateLandingPage(landingPage.id, { avatarUrl: null });

      res.json({ success: true });
    } catch (error) {
      console.error("Avatar delete error:", error);
      res.status(500).json({ error: "Failed to remove avatar" });
    }
  });

  // ============================================
  // STRIPE CONNECT ROUTES (Artist Payouts)
  // ============================================

  // Start Stripe Connect onboarding
  app.post("/api/stripe/connect/create", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user already has a Connect account
      if (user.stripeConnectAccountId) {
        // Check if onboarding is complete
        const status = await getAccountStatus(user.stripeConnectAccountId);
        if (status.detailsSubmitted) {
          return res.status(400).json({ error: "Stripe account already connected" });
        }
        // Resume onboarding for existing account
        const connectBaseUrl = getBaseUrl(req);
        const accountLink = await createAccountLink(
          user.stripeConnectAccountId,
          `${connectBaseUrl}/dashboard?stripe_connect=refresh`,
          `${connectBaseUrl}/dashboard?stripe_connect=complete`
        );
        return res.json({ url: accountLink.url });
      }

      // Create new Connect account
      const account = await createConnectAccount(userId, user.email);

      // Save account ID to user
      await storage.updateUser(userId, {
        stripeConnectAccountId: account.id,
        stripeConnectOnboardingComplete: false,
      });

      // Create onboarding link
      const connectBaseUrl = getBaseUrl(req);
      const accountLink = await createAccountLink(
        account.id,
        `${connectBaseUrl}/dashboard?stripe_connect=refresh`,
        `${connectBaseUrl}/dashboard?stripe_connect=complete`
      );

      res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Stripe Connect create error:", error);
      res.status(500).json({ error: "Failed to start Stripe Connect onboarding" });
    }
  });

  // Get Stripe Connect status
  app.get("/api/stripe/connect/status", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeConnectAccountId) {
        return res.json({
          connected: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      let status;
      try {
        status = await getAccountStatus(user.stripeConnectAccountId);
      } catch (stripeError: any) {
        // Handle invalid/revoked account - clear the stale ID and let user reconnect
        if (stripeError.code === 'account_invalid' || stripeError.type === 'invalid_request_error') {
          console.log(`[STRIPE CONNECT] Account ${user.stripeConnectAccountId} is invalid/revoked, clearing from user ${userId}`);
          await storage.updateUser(userId, {
            stripeConnectAccountId: null,
            stripeConnectOnboardingComplete: false,
          });
          return res.json({
            connected: false,
            onboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            accountRevoked: true,
          });
        }
        throw stripeError;
      }

      // Update onboarding status if it changed
      if (status.detailsSubmitted && !user.stripeConnectOnboardingComplete) {
        await storage.updateUser(userId, {
          stripeConnectOnboardingComplete: true,
        });
      }

      res.json({
        connected: true,
        onboardingComplete: status.detailsSubmitted,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        requirements: status.requirements,
      });
    } catch (error) {
      console.error("Stripe Connect status error:", error);
      res.status(500).json({ error: "Failed to get Stripe Connect status" });
    }
  });

  // Get Stripe Connect dashboard link
  app.get("/api/stripe/connect/dashboard", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.stripeConnectAccountId) {
        return res.status(400).json({ error: "No Stripe Connect account" });
      }

      let loginLink;
      try {
        loginLink = await createLoginLink(user.stripeConnectAccountId);
      } catch (stripeError: any) {
        // Handle invalid/revoked account
        if (stripeError.code === 'account_invalid' || stripeError.type === 'invalid_request_error') {
          console.log(`[STRIPE CONNECT] Account ${user.stripeConnectAccountId} is invalid/revoked, clearing from user ${userId}`);
          await storage.updateUser(userId, {
            stripeConnectAccountId: null,
            stripeConnectOnboardingComplete: false,
          });
          return res.status(400).json({ error: "Stripe account was disconnected. Please reconnect." });
        }
        throw stripeError;
      }
      res.json({ url: loginLink.url });
    } catch (error) {
      console.error("Stripe Connect dashboard error:", error);
      res.status(500).json({ error: "Failed to get Stripe dashboard link" });
    }
  });

  // Refresh Stripe Connect onboarding link (if expired)
  app.post("/api/stripe/connect/refresh", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.stripeConnectAccountId) {
        return res.status(400).json({ error: "No Stripe Connect account" });
      }

      const connectBaseUrl = getBaseUrl(req);
      const accountLink = await createAccountLink(
        user.stripeConnectAccountId,
        `${connectBaseUrl}/dashboard?stripe_connect=refresh`,
        `${connectBaseUrl}/dashboard?stripe_connect=complete`
      );

      res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Stripe Connect refresh error:", error);
      res.status(500).json({ error: "Failed to refresh onboarding link" });
    }
  });

  // ============================================
  // MUSIC TRACKS ROUTES (Music Store Feature)
  // ============================================

  // Get tracks for a landing page (authenticated - owner only)
  app.get("/api/landing-page/tracks", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        // Return empty array if user has no landing page yet
        return res.json([]);
      }

      const tracks = await storage.getTracksByLandingPage(landingPage.id);
      res.json(tracks);
    } catch (error) {
      console.error("Get tracks error:", error);
      res.status(500).json({ error: "Failed to get tracks" });
    }
  });

  // Upload a new track — wraps multer to catch its errors at the route level
  app.post("/api/landing-page/tracks", (req: Request, res: Response, next) => {
    audioUpload.single("audio")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: "File too large. Maximum size is 200MB." });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      let landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        // Auto-create landing page if user doesn't have one
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
        const slug = user.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        landingPage = await storage.createLandingPage({
          userId: user.id,
          slug: `${slug}-${user.id.slice(0, 8)}`,
          artistName: user.name,
          tagline: "Independent Artist",
          bio: "",
          socialLinks: JSON.stringify([]),
          isPublished: false,
        });
      }

      // Parse metadata from request body
      const {
        title,
        artistName,
        description,
        priceInCents,
        currency = 'gbp',
        pricingType = 'fixed', // 'fixed' | 'pwyw'
        minimumPriceInCents = 0,
        suggestedPriceInCents,
        allowFreeStreaming = false,
        previewStartSeconds
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Validate pricing based on type
      const price = parseInt(priceInCents, 10);
      const minPrice = parseInt(minimumPriceInCents, 10) || 0;
      const suggestedPrice = suggestedPriceInCents ? parseInt(suggestedPriceInCents, 10) : null;
      const isFreeStreaming = allowFreeStreaming === 'true' || allowFreeStreaming === true;

      if (pricingType === 'fixed') {
        if (isNaN(price) || price < 50) {
          return res.status(400).json({ error: "Price must be at least 50 pence for fixed pricing" });
        }
      } else if (pricingType === 'pwyw') {
        // For PWYW, minimum can be 0 (free with optional tip)
        if (minPrice < 0) {
          return res.status(400).json({ error: "Minimum price cannot be negative" });
        }
        // If minimum is set, it must be at least 50p due to Stripe minimums
        if (minPrice > 0 && minPrice < 50) {
          return res.status(400).json({ error: "Minimum price must be at least 50 pence or free (0)" });
        }
      } else {
        return res.status(400).json({ error: "Invalid pricing type. Must be 'fixed' or 'pwyw'" });
      }

      // Verify file type
      const verification = await verifyAudioType(file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      const fileFormat = verification.type as 'mp3' | 'wav';

      // Generate track ID
      const trackId = crypto.randomUUID();

      // Upload original file first (must complete before responding)
      const uploadResult = await uploadTrackAudio(userId, trackId, file.buffer, fileFormat);

      // Create track record in database immediately so client gets a fast response
      // Preview, metadata, and Stripe product are generated in the background
      const track = await storage.createTrack({
        id: trackId,
        landingPageId: landingPage.id,
        userId,
        title,
        artistName: artistName || null,
        description: description || null,
        priceInCents: pricingType === 'pwyw' ? (suggestedPrice || minPrice || 0) : price,
        currency,
        pricingType: pricingType as 'fixed' | 'pwyw',
        minimumPriceInCents: minPrice,
        suggestedPriceInCents: suggestedPrice,
        allowFreeStreaming: isFreeStreaming,
        originalFilePath: uploadResult.path,
        previewFilePath: null,
        coverArtPath: null,
        originalFileName: file.originalname,
        fileFormat,
        fileSizeBytes: file.buffer.length,
        durationSeconds: null,
        previewStartSeconds: (previewStartSeconds !== undefined ? parseInt(previewStartSeconds, 10) : 0) || 0,
        stripeProductId: null,
        stripePriceId: null,
        displayOrder: 0,
        isPublished: false,
      });

      // Respond immediately so the client doesn't hang
      res.json(track);

      // Process heavy tasks in the background (preview generation, metadata, Stripe)
      const audioBuffer = file.buffer;
      setImmediate(async () => {
        try {
          const updates: Record<string, any> = {};

          // Get audio metadata (duration)
          try {
            const metadata = await getAudioMetadata(audioBuffer);
            if (isFinite(metadata.duration) && metadata.duration > 0) {
              updates.durationSeconds = metadata.duration;
            } else {
              console.warn("[TRACKS] Background: Invalid duration value:", metadata.duration);
            }
          } catch (err) {
            console.warn("[TRACKS] Background: Failed to get audio duration:", err);
          }

          // Generate and upload preview
          try {
            const parsedPreviewStart = previewStartSeconds !== undefined ? parseInt(previewStartSeconds, 10) : undefined;
            const preview = await generatePreview(audioBuffer, fileFormat, 30, isNaN(parsedPreviewStart!) ? undefined : parsedPreviewStart);
            const previewUpload = await uploadTrackPreview(userId, trackId, preview.buffer, fileFormat);
            updates.previewFilePath = previewUpload.path;
          } catch (err) {
            console.warn("[TRACKS] Background: Failed to generate preview:", err);
          }

          // Create Stripe product and price
          try {
            const stripeResult = await createTrackProduct({
              trackId,
              title,
              artistName: artistName || landingPage.artistName,
              priceInCents: price,
              currency,
            });
            updates.stripeProductId = stripeResult.productId;
            updates.stripePriceId = stripeResult.priceId;
          } catch (err) {
            console.error("[TRACKS] Background: Failed to create Stripe product:", err);
          }

          // Update track with background-processed data
          if (Object.keys(updates).length > 0) {
            await storage.updateTrack(trackId, updates);
            console.log(`[TRACKS] Background processing complete for track ${trackId}:`, Object.keys(updates));
          }
        } catch (err) {
          console.error(`[TRACKS] Background processing failed for track ${trackId}:`, err);
        }
      });
    } catch (error) {
      console.error("Upload track error:", error);
      res.status(500).json({ error: "Failed to upload track" });
    }
  });

  // Initialize chunked audio upload
  app.post("/api/landing-page/tracks/init-upload", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
        const slug = user.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        landingPage = await storage.createLandingPage({
          userId: user.id,
          slug: `${slug}-${user.id.slice(0, 8)}`,
          artistName: user.name,
          tagline: "Independent Artist",
          bio: "",
          socialLinks: JSON.stringify([]),
          isPublished: false,
        });
      }

      const {
        totalChunks,
        fileName,
        fileFormat,
        title,
        artistName,
        description,
        priceInCents,
        pricingType,
        minimumPriceInCents,
        suggestedPriceInCents,
        allowFreeStreaming,
        previewStartSeconds,
        currency,
      } = req.body;

      if (!totalChunks || !fileName || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const validFormats = ['mp3', 'wav'];
      const format = (fileFormat || fileName.split('.').pop())?.toLowerCase();
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: `Invalid file format. Accepted: ${validFormats.join(', ')}` });
      }

      const uploadId = crypto.randomUUID();

      chunkedUploads.set(uploadId, {
        userId,
        landingPageId: landingPage.id,
        mediaType: 'audio',
        chunks: new Array(totalChunks).fill(null),
        totalChunks,
        receivedChunks: 0,
        metadata: {
          title,
          description,
          originalFileName: fileName,
          fileFormat: format,
          artistName,
          priceInCents: parseInt(priceInCents, 10) || undefined,
          pricingType: pricingType || 'fixed',
          minimumPriceInCents: parseInt(minimumPriceInCents, 10) || undefined,
          suggestedPriceInCents: suggestedPriceInCents ? parseInt(suggestedPriceInCents, 10) : undefined,
          allowFreeStreaming: allowFreeStreaming === true || allowFreeStreaming === 'true',
          previewStartSeconds: previewStartSeconds !== undefined ? parseInt(previewStartSeconds, 10) : undefined,
          currency: currency || 'gbp',
        },
        createdAt: new Date(),
      });

      console.log(`[AUDIO CHUNKED] Initialized upload ${uploadId} for ${fileName} (${totalChunks} chunks)`);

      res.json({ uploadId, totalChunks });
    } catch (error) {
      console.error("Init audio chunked upload error:", error);
      res.status(500).json({ error: "Failed to initialize upload" });
    }
  });

  // Upload an audio chunk (reuses same chunk logic as video)
  app.post("/api/landing-page/tracks/chunk", express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10);

      if (!uploadId || isNaN(chunkIndex)) {
        return res.status(400).json({ error: "Missing upload ID or chunk index" });
      }

      const upload = chunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
        return res.status(400).json({ error: "Invalid chunk index" });
      }

      const chunkBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      upload.chunks[chunkIndex] = chunkBuffer;
      upload.receivedChunks++;

      console.log(`[AUDIO CHUNKED] Received chunk ${chunkIndex + 1}/${upload.totalChunks} for ${uploadId}`);

      res.json({
        received: upload.receivedChunks,
        total: upload.totalChunks,
        complete: upload.receivedChunks === upload.totalChunks,
      });
    } catch (error) {
      console.error("Audio upload chunk error:", error);
      res.status(500).json({ error: "Failed to upload chunk" });
    }
  });

  // Complete chunked audio upload
  app.post("/api/landing-page/tracks/complete-upload", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uploadId } = req.body;
      if (!uploadId) {
        return res.status(400).json({ error: "Missing upload ID" });
      }

      const upload = chunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (upload.receivedChunks !== upload.totalChunks) {
        return res.status(400).json({
          error: `Missing chunks. Received ${upload.receivedChunks}/${upload.totalChunks}`,
        });
      }

      if (upload.chunks.some(c => c === null)) {
        return res.status(400).json({ error: "Some chunks are missing" });
      }

      console.log(`[AUDIO CHUNKED] Completing upload ${uploadId}...`);

      // Combine chunks
      const completeBuffer = Buffer.concat(upload.chunks);
      console.log(`[AUDIO CHUNKED] Combined buffer size: ${completeBuffer.length} bytes`);

      // Verify audio file type
      const verification = await verifyAudioType(completeBuffer);
      if (!verification.valid) {
        chunkedUploads.delete(uploadId);
        return res.status(400).json({ error: verification.error });
      }

      const fileFormat = verification.type as 'mp3' | 'wav';
      const trackId = crypto.randomUUID();
      const { metadata } = upload;
      const landingPageId = upload.landingPageId;

      // Validate pricing
      const pricingType = metadata.pricingType || 'fixed';
      const price = metadata.priceInCents || 0;
      const minPrice = metadata.minimumPriceInCents || 0;
      const suggestedPrice = metadata.suggestedPriceInCents || null;
      const isFreeStreaming = metadata.allowFreeStreaming || false;
      const previewStartSeconds = metadata.previewStartSeconds;

      // Upload original file to storage
      console.log(`[AUDIO CHUNKED] Uploading ${completeBuffer.length} bytes to storage...`);
      const uploadResult = await uploadTrackAudio(userId, trackId, completeBuffer, fileFormat);
      console.log(`[AUDIO CHUNKED] Upload successful: ${uploadResult.path}`);

      // Get landing page for artist name fallback
      const landingPage = await storage.getLandingPage(landingPageId);

      // Create track record immediately
      const track = await storage.createTrack({
        id: trackId,
        landingPageId,
        userId,
        title: metadata.title,
        artistName: metadata.artistName || null,
        description: metadata.description || null,
        priceInCents: pricingType === 'pwyw' ? (suggestedPrice || minPrice || 0) : price,
        currency: metadata.currency || 'gbp',
        pricingType: pricingType as 'fixed' | 'pwyw',
        minimumPriceInCents: minPrice,
        suggestedPriceInCents: suggestedPrice,
        allowFreeStreaming: isFreeStreaming,
        originalFilePath: uploadResult.path,
        previewFilePath: null,
        coverArtPath: null,
        originalFileName: metadata.originalFileName,
        fileFormat,
        fileSizeBytes: completeBuffer.length,
        durationSeconds: null,
        previewStartSeconds: previewStartSeconds || 0,
        stripeProductId: null,
        stripePriceId: null,
        displayOrder: 0,
        isPublished: false,
      });

      // Clean up chunks from memory
      chunkedUploads.delete(uploadId);

      // Respond immediately
      console.log(`[AUDIO CHUNKED] Completed upload ${uploadId} -> track ${trackId}`);
      res.json(track);

      // Background processing: metadata, preview, Stripe
      const audioBuffer = completeBuffer;
      setImmediate(async () => {
        try {
          const updates: Record<string, any> = {};

          try {
            const audioMeta = await getAudioMetadata(audioBuffer);
            if (isFinite(audioMeta.duration) && audioMeta.duration > 0) {
              updates.durationSeconds = audioMeta.duration;
            } else {
              console.warn("[AUDIO CHUNKED] Background: Invalid duration value:", audioMeta.duration);
            }
          } catch (err) {
            console.warn("[AUDIO CHUNKED] Background: Failed to get audio duration:", err);
          }

          try {
            const parsedStart = previewStartSeconds !== undefined ? previewStartSeconds : undefined;
            const preview = await generatePreview(audioBuffer, fileFormat, 30, parsedStart);
            const previewUpload = await uploadTrackPreview(userId, trackId, preview.buffer, fileFormat);
            updates.previewFilePath = previewUpload.path;
          } catch (err) {
            console.warn("[AUDIO CHUNKED] Background: Failed to generate preview:", err);
          }

          try {
            const stripeResult = await createTrackProduct({
              trackId,
              title: metadata.title,
              artistName: metadata.artistName || landingPage?.artistName || 'Artist',
              priceInCents: price,
              currency: metadata.currency || 'gbp',
            });
            updates.stripeProductId = stripeResult.productId;
            updates.stripePriceId = stripeResult.priceId;
          } catch (err) {
            console.error("[AUDIO CHUNKED] Background: Failed to create Stripe product:", err);
          }

          if (Object.keys(updates).length > 0) {
            await storage.updateTrack(trackId, updates);
            console.log(`[AUDIO CHUNKED] Background processing complete for track ${trackId}:`, Object.keys(updates));
          }
        } catch (err) {
          console.error(`[AUDIO CHUNKED] Background processing failed for track ${trackId}:`, err);
        }
      });
    } catch (error) {
      console.error("Complete audio chunked upload error:", error);
      res.status(500).json({ error: "Failed to complete upload" });
    }
  });

  // Get single track details
  app.get("/api/tracks/:id", async (req: Request, res: Response) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Check ownership for unpublished tracks
      const userId = (req.session as any).userId;
      if (!track.isPublished && track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      res.json(track);
    } catch (error) {
      console.error("Get track error:", error);
      res.status(500).json({ error: "Failed to get track" });
    }
  });

  // Update track metadata
  app.patch("/api/tracks/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.id);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const { title, artistName, description, priceInCents, isPublished, displayOrder } = req.body;

      // If price is changing and we have a Stripe product, update it
      if (priceInCents !== undefined && priceInCents !== track.priceInCents && track.stripeProductId) {
        try {
          const newPriceId = await updateTrackPriceStripe(
            track.stripeProductId,
            priceInCents,
            track.stripePriceId || undefined,
            track.currency || 'gbp'
          );
          req.body.stripePriceId = newPriceId;
        } catch (err) {
          console.warn("[TRACKS] Failed to update Stripe price:", err);
        }
      }

      const updatedTrack = await storage.updateTrack(req.params.id, req.body);
      res.json(updatedTrack);
    } catch (error) {
      console.error("Update track error:", error);
      res.status(500).json({ error: "Failed to update track" });
    }
  });

  // Update track preview (regenerate with new start time) — Theta tier only
  app.patch("/api/tracks/:id/preview", requireAuth, requireFeature('track-preview-selection'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const track = await storage.getTrack(req.params.id);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const { previewStartSeconds } = req.body;
      if (previewStartSeconds === undefined || typeof previewStartSeconds !== "number") {
        return res.status(400).json({ error: "previewStartSeconds is required and must be a number" });
      }

      const duration = track.durationSeconds || 0;
      if (duration > 30 && (previewStartSeconds < 0 || previewStartSeconds > duration - 30)) {
        return res.status(400).json({ error: `previewStartSeconds must be between 0 and ${Math.max(0, duration - 30)}` });
      }

      // Download original file and regenerate preview
      const originalBuffer = await downloadTrackFile(track.originalFilePath);
      const fileFormat = (track.fileFormat || 'mp3') as 'mp3' | 'wav';
      const preview = await generatePreview(originalBuffer, fileFormat, 30, previewStartSeconds);
      const previewUpload = await uploadTrackPreview(userId, track.id, preview.buffer, fileFormat);

      const updatedTrack = await storage.updateTrack(req.params.id, {
        previewFilePath: previewUpload.path,
        previewStartSeconds,
      });

      res.json(updatedTrack);
    } catch (error) {
      console.error("Update preview error:", error);
      res.status(500).json({ error: "Failed to update preview" });
    }
  });

  // Delete track
  app.delete("/api/tracks/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.id);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Archive Stripe product if exists
      if (track.stripeProductId) {
        try {
          await archiveTrackProduct(track.stripeProductId);
        } catch (err) {
          console.warn("[TRACKS] Failed to archive Stripe product:", err);
        }
      }

      // Delete files from storage
      try {
        await deleteTrackFiles(userId, track.id);
      } catch (err) {
        console.warn("[TRACKS] Failed to delete track files:", err);
      }

      // Delete track record
      await storage.deleteTrack(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete track error:", error);
      res.status(500).json({ error: "Failed to delete track" });
    }
  });

  // Upload cover art for a track
  app.post("/api/tracks/:id/cover", (req: Request, res: Response, next) => {
    coverArtUpload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Cover art multer error:", err.message);
        return res.status(400).json({ error: err.message || "Failed to process image" });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        console.log("[COVER] Not authenticated");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.id);
      if (!track || track.userId !== userId) {
        console.log("[COVER] Track not found or not owned:", req.params.id);
        return res.status(404).json({ error: "Track not found" });
      }

      const file = req.file;
      if (!file) {
        console.log("[COVER] No image in request");
        return res.status(400).json({ error: "No image uploaded" });
      }

      console.log("[COVER] Uploading cover for track:", track.id, "file:", file.originalname, "size:", file.size);

      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const result = await uploadTrackCover(userId, track.id, file.buffer, extension);

      const url = `/api/tracks/${track.id}/cover/${encodeURIComponent(result.path)}`;
      await storage.updateTrack(track.id, { coverArtPath: result.path });

      console.log("[COVER] Upload successful:", result.path);
      res.json({ success: true, url, path: result.path });
    } catch (error) {
      console.error("Cover art upload error:", error);
      res.status(500).json({ error: "Failed to upload cover art" });
    }
  });

  // Serve track cover art
  app.get("/api/tracks/:id/cover/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';

      const buffer = await downloadTrackFile(filePath);

      res.set('Content-Type', getImageContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (error) {
      console.error("Cover art download error:", error);
      res.status(404).json({ error: "Cover art not found" });
    }
  });

  // Stream track preview (public)
  app.get("/api/tracks/:id/preview", async (req: Request, res: Response) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Only serve published tracks publicly
      const userId = (req.session as any).userId;
      if (!track.isPublished && track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Use preview if available, otherwise serve original
      const filePath = track.previewFilePath || track.originalFilePath;
      const buffer = await downloadTrackFile(filePath);

      // Increment play count
      await storage.incrementTrackPlayCount(track.id);

      res.set('Content-Type', getAudioContentType(track.fileFormat));
      res.set('Content-Length', buffer.length.toString());
      res.set('Accept-Ranges', 'bytes');
      res.send(buffer);
    } catch (error) {
      console.error("Preview stream error:", error);
      res.status(500).json({ error: "Failed to stream preview" });
    }
  });

  // Stream full track (public - only for tracks with allowFreeStreaming enabled)
  app.get("/api/tracks/:id/stream", async (req: Request, res: Response) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Only serve published tracks publicly
      const userId = (req.session as any).userId;
      if (!track.isPublished && track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Check if free streaming is enabled for this track
      if (!track.allowFreeStreaming) {
        return res.status(403).json({ error: "Free streaming is not enabled for this track" });
      }

      // Stream the full original file
      const buffer = await downloadTrackFile(track.originalFilePath);

      // Increment play count
      await storage.incrementTrackPlayCount(track.id);

      res.set('Content-Type', getAudioContentType(track.fileFormat));
      res.set('Content-Length', buffer.length.toString());
      res.set('Accept-Ranges', 'bytes');
      res.send(buffer);
    } catch (error) {
      console.error("Full track stream error:", error);
      res.status(500).json({ error: "Failed to stream track" });
    }
  });

  // Get published tracks for an artist page (public)
  app.get("/api/artist/:slug/tracks", async (req: Request, res: Response) => {
    try {
      const page = await storage.getLandingPageBySlug(req.params.slug);
      if (!page || !page.isPublished) {
        return res.status(404).json({ error: "Artist page not found" });
      }

      const tracks = await storage.getPublishedTracksByLandingPage(page.id);
      res.json(tracks);
    } catch (error) {
      console.error("Get artist tracks error:", error);
      res.status(500).json({ error: "Failed to get tracks" });
    }
  });

  // Create checkout session for track purchase
  app.post("/api/tracks/:id/checkout", async (req: Request, res: Response) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track || !track.isPublished) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Get landing page for slug
      const landingPage = await storage.getLandingPage(track.landingPageId);
      if (!landingPage) {
        return res.status(404).json({ error: "Artist page not found" });
      }

      const { buyerEmail, customAmount } = req.body;

      // Determine the amount to charge
      let amountInCents: number;
      const isPWYW = track.pricingType === 'pwyw';

      if (isPWYW) {
        // For PWYW, use custom amount from buyer
        if (customAmount !== undefined) {
          amountInCents = parseInt(customAmount, 10);
          if (isNaN(amountInCents) || amountInCents < 0) {
            return res.status(400).json({ error: "Invalid amount" });
          }
          // Validate against minimum (but allow 0 if minimum is 0)
          const minPrice = track.minimumPriceInCents || 0;
          if (amountInCents < minPrice) {
            return res.status(400).json({ error: `Amount must be at least ${minPrice} pence` });
          }
          // If paying, must be at least 50p (Stripe minimum)
          if (amountInCents > 0 && amountInCents < 50) {
            return res.status(400).json({ error: "If paying, minimum is 50 pence" });
          }
        } else {
          // Use suggested price or minimum as default
          amountInCents = track.suggestedPriceInCents || track.minimumPriceInCents || 0;
        }

        // If amount is 0, handle free download (no Stripe needed)
        if (amountInCents === 0) {
          // Generate download token directly
          const downloadToken = crypto.randomBytes(32).toString('hex');
          const downloadExpires = new Date();
          downloadExpires.setDate(downloadExpires.getDate() + 30);

          await storage.createTrackPurchase({
            trackId: track.id,
            buyerEmail: buyerEmail || 'free@download.local',
            buyerName: null,
            stripePaymentIntentId: null,
            stripeCheckoutSessionId: null,
            amountPaidCents: 0,
            currency: track.currency || 'gbp',
            downloadToken,
            downloadCount: 0,
            maxDownloads: 5,
            downloadExpiresAt: downloadExpires,
            status: 'completed',
          });

          // Increment purchase count
          await storage.incrementTrackPurchaseCount(track.id);

          return res.json({
            free: true,
            downloadToken,
            trackId: track.id,
          });
        }
      } else {
        // Fixed pricing - must have Stripe price
        if (!track.stripePriceId) {
          return res.status(400).json({ error: "Track is not available for purchase" });
        }
        amountInCents = track.priceInCents;
      }

      // Get track owner's Stripe Connect account for payout
      const trackOwner = await storage.getUser(track.userId);

      // Check if track has verified collaborator splits
      const splits = await storage.getTrackSplitsByTrack(track.id);
      const verifiedSplits = splits.filter(s => s.status === 'verified' && s.stripeConnectAccountId);
      const hasSplits = verifiedSplits.length > 0;

      let connectedAccountId: string | undefined;
      let applicationFeeAmount = 0;

      // For tracks with splits, we use "separate charges and transfers" pattern
      // Payment goes to platform first, then we create transfers after success
      // For tracks without splits, we use direct transfer to owner
      if (!hasSplits && trackOwner?.stripeConnectAccountId && trackOwner?.stripeConnectOnboardingComplete) {
        // No splits - direct transfer to track owner
        try {
          const isReady = await isAccountReady(trackOwner.stripeConnectAccountId);
          if (isReady) {
            connectedAccountId = trackOwner.stripeConnectAccountId;
            applicationFeeAmount = calculatePlatformFee(amountInCents);
          }
        } catch (err) {
          console.warn("[CHECKOUT] Failed to check Connect account status:", err);
        }
      } else if (hasSplits) {
        // Has splits - payment goes to platform, transfers happen after payment
        console.log(`[CHECKOUT] Track ${track.id} has ${verifiedSplits.length} verified splits - using separate transfers`);
        // No connectedAccountId means payment goes to platform
      }

      // For PWYW with custom amount, we need to create a checkout with custom price
      const session = await createTrackCheckoutSession({
        trackId: track.id,
        priceId: isPWYW ? undefined : (track.stripePriceId || undefined),
        customAmountCents: isPWYW ? amountInCents : undefined,
        trackTitle: track.title,
        artistName: track.artistName || landingPage.artistName,
        productId: track.stripeProductId || undefined,
        buyerEmail,
        landingPageSlug: landingPage.slug,
        baseUrl: getBaseUrl(req),
        currency: track.currency || 'gbp',
        connectedAccountId,
        applicationFeeAmount,
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Checkout creation error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify purchase and get download token
  app.get("/api/tracks/purchase/verify", async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Session ID required" });
      }

      const session = await getCheckoutSessionStripe(session_id);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      // Check if purchase already recorded
      const existingPurchase = await storage.getTrackPurchaseBySession(session_id);
      if (existingPurchase) {
        return res.json({
          success: true,
          downloadToken: existingPurchase.downloadToken,
          trackId: existingPurchase.trackId,
        });
      }

      // Extract details and create purchase record
      const details = extractTrackPurchaseDetails(session);
      if (!details.trackId) {
        return res.status(400).json({ error: "Invalid purchase session" });
      }

      const downloadToken = crypto.randomBytes(32).toString('hex');
      const downloadExpires = new Date();
      downloadExpires.setDate(downloadExpires.getDate() + 30); // 30 days

      const purchase = await storage.createTrackPurchase({
        trackId: details.trackId,
        buyerEmail: details.buyerEmail,
        buyerName: details.buyerName || null,
        stripePaymentIntentId: details.paymentIntentId || null,
        stripeCheckoutSessionId: session_id,
        amountPaidCents: details.amountPaid,
        currency: details.currency,
        downloadToken,
        downloadCount: 0,
        maxDownloads: 5,
        downloadExpiresAt: downloadExpires,
        status: 'completed',
      });

      // Increment purchase count
      await storage.incrementTrackPurchaseCount(details.trackId);

      // Get track and artist details for emails
      const track = await storage.getTrack(details.trackId);
      const baseUrl = getBaseUrl(req);

      // Process split transfers if track has verified collaborators
      if (track && details.paymentIntentId) {
        const splits = await storage.getTrackSplitsByTrack(details.trackId);
        const verifiedSplits = splits.filter(s => s.status === 'verified' && s.stripeConnectAccountId);

        if (verifiedSplits.length > 0) {
          // Calculate net amount after platform fee
          const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '0', 10);
          const platformFee = Math.round((details.amountPaid * platformFeePercent) / 100);
          const netAmount = details.amountPaid - platformFee;

          // Calculate each collaborator's share
          const splitTransfers = verifiedSplits.map(split => ({
            collaboratorName: split.collaboratorName,
            collaboratorEmail: split.collaboratorEmail,
            stripeConnectAccountId: split.stripeConnectAccountId!,
            amountCents: Math.round((netAmount * split.splitPercentage) / 100),
          }));

          // Create transfers to collaborators
          console.log('[PURCHASE] Processing split transfers for', verifiedSplits.length, 'collaborators');
          createSplitTransfers({
            paymentIntentId: details.paymentIntentId,
            splits: splitTransfers,
            trackId: details.trackId,
            trackTitle: track.title,
            currency: details.currency,
          }).then(transfers => {
            console.log('[PURCHASE] Split transfers completed:', transfers.length);
          }).catch(err => {
            console.error('[PURCHASE] Failed to process split transfers:', err);
          });

          // Calculate owner's remaining share for notification
          const ownerPercentage = track.ownerSplitPercentage || (100 - verifiedSplits.reduce((sum, s) => sum + s.splitPercentage, 0));
          const ownerEarnings = Math.round((netAmount * ownerPercentage) / 100);

          // Update the artist earnings for notification
          const artist = await storage.getUser(track.userId);
          if (artist?.email) {
            console.log('[PURCHASE] Sending artist notification with split earnings to:', artist.email);
            sendTrackSoldNotificationEmail(
              artist.email,
              artist.name,
              track.title,
              details.buyerName || details.buyerEmail,
              ownerEarnings,
              details.currency
            ).then(result => {
              console.log('[PURCHASE] Artist notification result:', result);
            }).catch(err => console.error('[PURCHASE] Failed to send artist notification:', err));
          }
        }
      }

      // Send purchase receipt email to buyer (async, don't block response)
      if (track) {
        const landingPage = await storage.getLandingPage(track.landingPageId);
        const artistName = track.artistName || landingPage?.artistName || 'Unknown Artist';

        console.log('[PURCHASE] Sending receipt email to:', details.buyerEmail);

        // Send receipt to buyer
        sendPurchaseReceiptEmail({
          buyerEmail: details.buyerEmail,
          buyerName: details.buyerName || '',
          trackTitle: track.title,
          artistName,
          amountPaidCents: details.amountPaid,
          currency: details.currency,
          downloadToken,
          downloadExpiresAt: downloadExpires,
          maxDownloads: 5,
          baseUrl,
        }).then(result => {
          console.log('[PURCHASE] Receipt email result:', result);
        }).catch(err => console.error('[PURCHASE] Failed to send receipt email:', err));

        // Only send standard artist notification if there are no split transfers
        // (split transfers have their own notification with adjusted earnings)
        const existingSplits = await storage.getTrackSplitsByTrack(track.id);
        const hasSplitTransfers = existingSplits.some(s => s.status === 'verified' && s.stripeConnectAccountId);

        if (!hasSplitTransfers) {
          // Notify the artist about the sale (full earnings)
          const artist = await storage.getUser(track.userId);
          if (artist?.email) {
            // Calculate artist's earnings (amount minus platform fee)
            const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '0', 10);
            const platformFee = Math.round((details.amountPaid * platformFeePercent) / 100);
            const artistEarnings = details.amountPaid - platformFee;

            console.log('[PURCHASE] Sending artist notification to:', artist.email);

            sendTrackSoldNotificationEmail(
              artist.email,
              artist.name,
              track.title,
              details.buyerName || details.buyerEmail,
              artistEarnings,
              details.currency
            ).then(result => {
              console.log('[PURCHASE] Artist notification result:', result);
            }).catch(err => console.error('[PURCHASE] Failed to send artist notification:', err));
          }
        }
      }

      res.json({
        success: true,
        downloadToken: purchase.downloadToken,
        trackId: purchase.trackId,
      });
    } catch (error) {
      console.error("Purchase verification error:", error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  // Download purchased track
  app.get("/api/downloads/:token", async (req: Request, res: Response) => {
    try {
      const purchase = await storage.getTrackPurchaseByToken(req.params.token);
      if (!purchase) {
        return res.status(404).json({ error: "Invalid download token" });
      }

      // Check status
      if (purchase.status !== 'completed') {
        return res.status(400).json({ error: "Purchase not completed" });
      }

      // Check download limit
      if ((purchase.downloadCount || 0) >= (purchase.maxDownloads || 5)) {
        return res.status(403).json({ error: "Download limit exceeded" });
      }

      // Check expiry
      if (purchase.downloadExpiresAt && new Date() > new Date(purchase.downloadExpiresAt)) {
        return res.status(403).json({ error: "Download link expired" });
      }

      // Get track
      const track = await storage.getTrack(purchase.trackId);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Download original file
      const buffer = await downloadTrackFile(track.originalFilePath);

      // Increment download count
      await storage.incrementDownloadCount(purchase.id);

      // Set headers for download
      const filename = `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.${track.fileFormat}`;
      res.set('Content-Type', getAudioContentType(track.fileFormat));
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      res.set('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download track" });
    }
  });

  // Get purchase history by email (for buyers to view their purchases)
  app.get("/api/purchases", async (req: Request, res: Response) => {
    try {
      const { email, token } = req.query;

      // Either authenticated user or valid download token required
      const userId = (req.session as any).userId;
      let buyerEmail: string | undefined;

      if (userId) {
        // Authenticated user - get their email
        const user = await storage.getUser(userId);
        buyerEmail = user?.email;
      } else if (token && typeof token === 'string') {
        // Validate via download token
        const purchase = await storage.getTrackPurchaseByToken(token);
        if (purchase) {
          buyerEmail = purchase.buyerEmail;
        }
      } else if (email && typeof email === 'string') {
        // Allow email lookup (will return limited info)
        buyerEmail = email;
      }

      if (!buyerEmail) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const purchases = await storage.getTrackPurchasesByEmail(buyerEmail);

      // Fetch track details for each purchase
      const purchasesWithTracks = await Promise.all(
        purchases.map(async (purchase) => {
          const track = await storage.getTrack(purchase.trackId);
          const landingPage = track ? await storage.getLandingPage(track.landingPageId) : null;

          return {
            id: purchase.id,
            trackId: purchase.trackId,
            trackTitle: track?.title || 'Unknown Track',
            artistName: track?.artistName || landingPage?.artistName || 'Unknown Artist',
            coverArtPath: track?.coverArtPath,
            amountPaidCents: purchase.amountPaidCents,
            currency: purchase.currency,
            downloadToken: purchase.downloadToken,
            downloadCount: purchase.downloadCount,
            maxDownloads: purchase.maxDownloads,
            downloadExpiresAt: purchase.downloadExpiresAt,
            status: purchase.status,
            createdAt: purchase.createdAt,
            canDownload: (
              purchase.status === 'completed' &&
              (purchase.downloadCount || 0) < (purchase.maxDownloads || 5) &&
              (!purchase.downloadExpiresAt || new Date() < new Date(purchase.downloadExpiresAt))
            ),
          };
        })
      );

      res.json(purchasesWithTracks);
    } catch (error) {
      console.error("Get purchases error:", error);
      res.status(500).json({ error: "Failed to get purchases" });
    }
  });

  // ============================================
  // ARTIST VIDEOS ROUTES (Video Store Feature)
  // ============================================

  // Get videos for the authenticated user's landing page (owner only)
  app.get("/api/landing-page/videos", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        // Return empty array if user has no landing page yet
        return res.json([]);
      }

      const videos = await storage.getArtistVideosByLandingPage(landingPage.id);
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ error: "Failed to get videos" });
    }
  });

  // ============================================
  // CHUNKED VIDEO UPLOAD (bypasses proxy limits)
  // ============================================

  // In-memory store for chunked uploads (in production, use Redis)
  const chunkedUploads = new Map<string, {
    userId: string;
    landingPageId: string;
    mediaType: 'video' | 'audio';
    chunks: Buffer[];
    totalChunks: number;
    receivedChunks: number;
    metadata: {
      title: string;
      description?: string;
      originalFileName: string;
      fileFormat: string;
      // Video-specific
      isPaywalled?: boolean;
      // Shared pricing
      priceInCents?: number;
      pricingType?: string;
      minimumPriceInCents?: number;
      suggestedPriceInCents?: number;
      currency?: string;
      // Audio-specific
      artistName?: string;
      allowFreeStreaming?: boolean;
      previewStartSeconds?: number;
    };
    createdAt: Date;
  }>();

  // Clean up stale uploads (older than 1 hour)
  setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [uploadId, upload] of Array.from(chunkedUploads.entries())) {
      if (upload.createdAt < oneHourAgo) {
        chunkedUploads.delete(uploadId);
        console.log(`[CHUNKED UPLOAD] Cleaned up stale upload: ${uploadId}`);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  // Initialize chunked upload
  app.post("/api/landing-page/videos/init-upload", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
        const slug = user.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        landingPage = await storage.createLandingPage({
          userId: user.id,
          slug: `${slug}-${user.id.slice(0, 8)}`,
          artistName: user.name,
          tagline: "Independent Artist",
          bio: "",
          socialLinks: JSON.stringify([]),
          isPublished: false,
        });
      }

      const {
        totalChunks,
        fileName,
        fileFormat,
        title,
        description,
        isPaywalled,
        priceInCents,
        pricingType,
        minimumPriceInCents,
        currency,
      } = req.body;

      if (!totalChunks || !fileName || !title) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate file format
      const validFormats = ['mp4', 'webm', 'mov'];
      const format = (fileFormat || fileName.split('.').pop())?.toLowerCase();
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: `Invalid file format. Accepted: ${validFormats.join(', ')}` });
      }

      const uploadId = crypto.randomUUID();

      chunkedUploads.set(uploadId, {
        userId,
        landingPageId: landingPage.id,
        mediaType: 'video',
        chunks: new Array(totalChunks).fill(null),
        totalChunks,
        receivedChunks: 0,
        metadata: {
          title,
          description,
          originalFileName: fileName,
          fileFormat: format,
          isPaywalled: isPaywalled === true || isPaywalled === 'true',
          priceInCents: parseInt(priceInCents, 10) || undefined,
          pricingType,
          minimumPriceInCents: parseInt(minimumPriceInCents, 10) || undefined,
          currency: currency || 'gbp',
        },
        createdAt: new Date(),
      });

      console.log(`[CHUNKED UPLOAD] Initialized upload ${uploadId} for ${fileName} (${totalChunks} chunks)`);

      res.json({ uploadId, totalChunks });
    } catch (error) {
      console.error("Init chunked upload error:", error);
      res.status(500).json({ error: "Failed to initialize upload" });
    }
  });

  // Upload a chunk
  app.post("/api/landing-page/videos/chunk", express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10);

      if (!uploadId || isNaN(chunkIndex)) {
        return res.status(400).json({ error: "Missing upload ID or chunk index" });
      }

      const upload = chunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (chunkIndex < 0 || chunkIndex >= upload.totalChunks) {
        return res.status(400).json({ error: "Invalid chunk index" });
      }

      // Store chunk
      const chunkBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      upload.chunks[chunkIndex] = chunkBuffer;
      upload.receivedChunks++;

      console.log(`[CHUNKED UPLOAD] Received chunk ${chunkIndex + 1}/${upload.totalChunks} for ${uploadId}`);

      res.json({
        received: upload.receivedChunks,
        total: upload.totalChunks,
        complete: upload.receivedChunks === upload.totalChunks,
      });
    } catch (error) {
      console.error("Upload chunk error:", error);
      res.status(500).json({ error: "Failed to upload chunk" });
    }
  });

  // Complete chunked upload
  app.post("/api/landing-page/videos/complete-upload", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uploadId } = req.body;
      if (!uploadId) {
        return res.status(400).json({ error: "Missing upload ID" });
      }

      const upload = chunkedUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }

      if (upload.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Check all chunks received
      if (upload.receivedChunks !== upload.totalChunks) {
        return res.status(400).json({
          error: `Missing chunks. Received ${upload.receivedChunks}/${upload.totalChunks}`,
        });
      }

      // Verify no null chunks
      if (upload.chunks.some(c => c === null)) {
        return res.status(400).json({ error: "Some chunks are missing" });
      }

      console.log(`[CHUNKED UPLOAD] Completing upload ${uploadId}...`);

      // Combine chunks
      const completeBuffer = Buffer.concat(upload.chunks);
      console.log(`[CHUNKED UPLOAD] Combined buffer size: ${completeBuffer.length} bytes`);

      // Verify file type
      const verification = await verifyVideoType(completeBuffer);
      if (!verification.valid) {
        chunkedUploads.delete(uploadId);
        return res.status(400).json({ error: verification.error });
      }

      const fileFormat = verification.type as 'mp4' | 'webm' | 'mov';
      const videoId = crypto.randomUUID();
      const { metadata } = upload;

      // Upload to storage
      const uploadResult = await uploadArtistVideo(userId, videoId, completeBuffer, fileFormat);

      // Parse pricing
      const paywalled = metadata.isPaywalled;
      const price = metadata.priceInCents || 0;
      const minPrice = metadata.minimumPriceInCents || 0;
      const pricingType = metadata.pricingType || 'fixed';

      // Create video record
      const video = await storage.createArtistVideo({
        id: videoId,
        landingPageId: upload.landingPageId,
        userId,
        title: metadata.title,
        description: metadata.description || null,
        originalFilePath: uploadResult.path,
        previewFilePath: null,
        thumbnailPath: null,
        originalFileName: metadata.originalFileName,
        fileFormat,
        fileSizeBytes: completeBuffer.length,
        durationSeconds: null,
        isPaywalled: paywalled,
        priceInCents: paywalled ? (pricingType === 'fixed' ? price : minPrice) : null,
        currency: metadata.currency,
        pricingType: paywalled ? pricingType as 'fixed' | 'pwyw' : null,
        minimumPriceInCents: paywalled && pricingType === 'pwyw' ? minPrice : null,
        stripeProductId: null,
        stripePriceId: null,
        displayOrder: 0,
        isPublished: true,
      });

      // Clean up
      chunkedUploads.delete(uploadId);
      console.log(`[CHUNKED UPLOAD] Completed upload ${uploadId} -> video ${videoId}`);

      res.json(video);
    } catch (error) {
      console.error("Complete chunked upload error:", error);
      res.status(500).json({ error: "Failed to complete upload" });
    }
  });

  // Upload a new video (with multer error handling) - kept for smaller files
  app.post("/api/landing-page/videos", (req: Request, res: Response, next) => {
    videoUpload.single("video")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: "File too large. Maximum video size is 500MB." });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No video file uploaded" });
      }

      let landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        // Auto-create landing page if user doesn't have one
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
        const slug = user.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        landingPage = await storage.createLandingPage({
          userId: user.id,
          slug: `${slug}-${user.id.slice(0, 8)}`,
          artistName: user.name,
          tagline: "Independent Artist",
          bio: "",
          socialLinks: JSON.stringify([]),
          isPublished: false,
        });
      }

      // Parse metadata from request body
      const {
        title,
        description,
        isPaywalled = false,
        priceInCents,
        currency = 'gbp',
        pricingType = 'fixed',
        minimumPriceInCents = 0,
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Verify file type
      const verification = await verifyVideoType(file.buffer);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }

      const fileFormat = verification.type as 'mp4' | 'webm' | 'mov';

      // Generate video ID
      const videoId = crypto.randomUUID();

      // Get video duration (basic estimation - in production you'd use ffprobe)
      let durationSeconds: number | undefined;

      // Upload original file
      const uploadResult = await uploadArtistVideo(userId, videoId, file.buffer, fileFormat);

      // TODO: Generate preview (10-second clip) using video processor
      let previewPath: string | undefined;

      // Parse pricing
      const paywalled = isPaywalled === 'true' || isPaywalled === true;
      const price = parseInt(priceInCents, 10) || 0;
      const minPrice = parseInt(minimumPriceInCents, 10) || 0;

      // Validate pricing if paywalled
      if (paywalled && pricingType === 'fixed') {
        if (price < 50) {
          return res.status(400).json({ error: "Price must be at least 50 pence for fixed pricing" });
        }
      }

      // Create video record in database
      const video = await storage.createArtistVideo({
        id: videoId,
        landingPageId: landingPage.id,
        userId,
        title,
        description: description || null,
        originalFilePath: uploadResult.path,
        previewFilePath: previewPath || null,
        thumbnailPath: null,
        originalFileName: file.originalname,
        fileFormat,
        fileSizeBytes: file.buffer.length,
        durationSeconds: durationSeconds || null,
        isPaywalled: paywalled,
        priceInCents: paywalled ? (pricingType === 'fixed' ? price : minPrice) : null,
        currency,
        pricingType: paywalled ? pricingType as 'fixed' | 'pwyw' : null,
        minimumPriceInCents: paywalled && pricingType === 'pwyw' ? minPrice : null,
        stripeProductId: null,
        stripePriceId: null,
        displayOrder: 0,
        isPublished: true,
      });

      res.json(video);
    } catch (error) {
      console.error("Upload video error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 500MB." });
        }
      }
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  // Get single video details
  app.get("/api/videos/:id", async (req: Request, res: Response) => {
    try {
      const video = await storage.getArtistVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check ownership for unpublished videos
      const userId = (req.session as any).userId;
      if (!video.isPublished && video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      res.json(video);
    } catch (error) {
      console.error("Get video error:", error);
      res.status(500).json({ error: "Failed to get video" });
    }
  });

  // Update video metadata
  app.patch("/api/videos/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const video = await storage.getArtistVideo(req.params.id);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      const { title, description, priceInCents, isPaywalled, isPublished, displayOrder } = req.body;

      const updatedVideo = await storage.updateArtistVideo(req.params.id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priceInCents !== undefined && { priceInCents }),
        ...(isPaywalled !== undefined && { isPaywalled }),
        ...(isPublished !== undefined && { isPublished }),
        ...(displayOrder !== undefined && { displayOrder }),
      });
      res.json(updatedVideo);
    } catch (error) {
      console.error("Update video error:", error);
      res.status(500).json({ error: "Failed to update video" });
    }
  });

  // Delete video
  app.delete("/api/videos/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const video = await storage.getArtistVideo(req.params.id);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Delete files from storage
      try {
        await deleteArtistVideoFiles(userId, video.id);
      } catch (err) {
        console.warn("[VIDEOS] Failed to delete video files:", err);
      }

      // Delete video record
      await storage.deleteArtistVideo(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Upload thumbnail for a video
  app.post("/api/videos/:id/thumbnail", coverArtUpload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const video = await storage.getArtistVideo(req.params.id);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const result = await uploadArtistVideoThumbnail(userId, video.id, file.buffer, extension);

      const url = `/api/videos/${video.id}/thumbnail/${encodeURIComponent(result.path)}`;
      await storage.updateArtistVideo(video.id, { thumbnailPath: result.path });

      res.json({ success: true, url, path: result.path });
    } catch (error) {
      console.error("Video thumbnail upload error:", error);
      res.status(500).json({ error: "Failed to upload thumbnail" });
    }
  });

  // Serve video thumbnail
  app.get("/api/videos/:id/thumbnail/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';

      const buffer = await downloadArtistVideoFile(filePath);

      res.set('Content-Type', getImageContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (error) {
      console.error("Video thumbnail download error:", error);
      res.status(404).json({ error: "Thumbnail not found" });
    }
  });

  // Stream video preview (public - 10 second preview for paywalled content)
  app.get("/api/videos/:id/preview", async (req: Request, res: Response) => {
    try {
      const video = await storage.getArtistVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Only serve published videos publicly
      const userId = (req.session as any).userId;
      if (!video.isPublished && video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Use preview if available, otherwise serve original
      const filePath = video.previewFilePath || video.originalFilePath;

      if (!filePath) {
        console.error(`Video ${video.id} has no file path`);
        return res.status(404).json({ error: "Video file not available" });
      }

      let buffer: Buffer;
      try {
        buffer = await downloadArtistVideoFile(filePath);
      } catch (downloadError: any) {
        console.error(`[VIDEO PREVIEW] Failed to download: ${filePath}`, downloadError?.message || downloadError);
        return res.status(404).json({ error: "Video file not found in storage" });
      }

      // Increment view count (non-blocking)
      storage.incrementVideoViewCount(video.id).catch(() => {});

      const contentType = getVideoContentType(video.fileFormat);
      const total = buffer.length;

      // Always respond with 206 Partial Content capped at 4MB to stay under
      // Replit's reverse proxy response size limit
      const MAX_CHUNK = 4 * 1024 * 1024;
      const range = req.headers.range;
      const start = range
        ? parseInt(range.replace(/bytes=/, '').split('-')[0], 10)
        : 0;
      const requestedEnd = range
        ? range.replace(/bytes=/, '').split('-')[1]
        : '';
      const end = requestedEnd
        ? Math.min(parseInt(requestedEnd, 10), start + MAX_CHUNK - 1, total - 1)
        : Math.min(start + MAX_CHUNK - 1, total - 1);
      const chunkSize = end - start + 1;

      res.status(206);
      res.set('Content-Range', `bytes ${start}-${end}/${total}`);
      res.set('Content-Length', chunkSize.toString());
      res.set('Content-Type', contentType);
      res.set('Accept-Ranges', 'bytes');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(buffer.subarray(start, end + 1));
    } catch (error: any) {
      console.error("[VIDEO PREVIEW] Stream error:", error?.message || error);
      res.status(500).json({ error: "Failed to stream preview" });
    }
  });

  // Stream full video (requires purchase for paywalled, free for non-paywalled)
  app.get("/api/videos/:id/stream", async (req: Request, res: Response) => {
    try {
      const video = await storage.getArtistVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Only serve published videos publicly
      const userId = (req.session as any).userId;
      if (!video.isPublished && video.userId !== userId) {
        return res.status(404).json({ error: "Video not found" });
      }

      // If paywalled, check for valid access token
      if (video.isPaywalled) {
        const accessToken = req.query.token as string;
        if (!accessToken) {
          return res.status(403).json({ error: "Access token required for paywalled content" });
        }

        const purchase = await storage.getVideoPurchaseByToken(accessToken);
        if (!purchase || purchase.videoId !== video.id || purchase.status !== 'completed') {
          return res.status(403).json({ error: "Invalid or expired access token" });
        }
      }

      if (!video.originalFilePath) {
        console.error(`Video ${video.id} has no original file path`);
        return res.status(404).json({ error: "Video file not available" });
      }

      let buffer: Buffer;
      try {
        buffer = await downloadArtistVideoFile(video.originalFilePath);
      } catch (downloadError: any) {
        console.error(`[VIDEO STREAM] Failed to download: ${video.originalFilePath}`, downloadError?.message);
        return res.status(404).json({ error: "Video file not found in storage" });
      }

      const contentType = getVideoContentType(video.fileFormat);
      const total = buffer.length;

      // Always respond with 206 Partial Content capped at 4MB to stay under
      // Replit's reverse proxy response size limit
      const MAX_CHUNK = 4 * 1024 * 1024;
      const range = req.headers.range;
      const start = range
        ? parseInt(range.replace(/bytes=/, '').split('-')[0], 10)
        : 0;
      const requestedEnd = range
        ? range.replace(/bytes=/, '').split('-')[1]
        : '';
      const end = requestedEnd
        ? Math.min(parseInt(requestedEnd, 10), start + MAX_CHUNK - 1, total - 1)
        : Math.min(start + MAX_CHUNK - 1, total - 1);
      const chunkSize = end - start + 1;

      res.status(206);
      res.set('Content-Range', `bytes ${start}-${end}/${total}`);
      res.set('Content-Length', chunkSize.toString());
      res.set('Content-Type', contentType);
      res.set('Accept-Ranges', 'bytes');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(buffer.subarray(start, end + 1));
    } catch (error: any) {
      console.error("[VIDEO STREAM] Error:", error?.message || error);
      res.status(500).json({ error: "Failed to stream video" });
    }
  });

  // Get published videos for an artist page (public)
  app.get("/api/artist/:slug/videos", async (req: Request, res: Response) => {
    try {
      const page = await storage.getLandingPageBySlug(req.params.slug);
      if (!page || !page.isPublished) {
        return res.status(404).json({ error: "Artist page not found" });
      }

      const videos = await storage.getPublishedArtistVideosByLandingPage(page.id);
      res.json(videos);
    } catch (error) {
      console.error("Get artist videos error:", error);
      res.status(500).json({ error: "Failed to get videos" });
    }
  });

  // Create checkout session for video purchase
  app.post("/api/videos/:id/checkout", async (req: Request, res: Response) => {
    try {
      const video = await storage.getArtistVideo(req.params.id);
      if (!video || !video.isPublished) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (!video.isPaywalled) {
        return res.status(400).json({ error: "Video is not paywalled" });
      }

      // Get landing page for slug
      const landingPage = await storage.getLandingPage(video.landingPageId);
      if (!landingPage) {
        return res.status(404).json({ error: "Artist page not found" });
      }

      const { buyerEmail, customAmount } = req.body;

      // Determine the amount to charge
      let amountInCents: number;
      const isPWYW = video.pricingType === 'pwyw';

      if (isPWYW) {
        if (customAmount !== undefined) {
          amountInCents = parseInt(customAmount, 10);
          if (isNaN(amountInCents) || amountInCents < 0) {
            return res.status(400).json({ error: "Invalid amount" });
          }
          const minPrice = video.minimumPriceInCents || 0;
          if (amountInCents < minPrice) {
            return res.status(400).json({ error: `Amount must be at least ${minPrice} pence` });
          }
          if (amountInCents > 0 && amountInCents < 50) {
            return res.status(400).json({ error: "If paying, minimum is 50 pence" });
          }
        } else {
          amountInCents = video.priceInCents || video.minimumPriceInCents || 0;
        }

        // Handle free access (PWYW with 0 amount)
        if (amountInCents === 0) {
          const accessToken = crypto.randomBytes(32).toString('hex');
          const accessExpires = new Date();
          accessExpires.setDate(accessExpires.getDate() + 30);

          await storage.createVideoPurchase({
            videoId: video.id,
            buyerEmail: buyerEmail || 'free@download.local',
            buyerName: null,
            stripePaymentIntentId: null,
            stripeCheckoutSessionId: null,
            amountPaidCents: 0,
            currency: video.currency || 'gbp',
            accessToken,
            accessExpiresAt: accessExpires,
            status: 'completed',
          });

          await storage.incrementVideoPurchaseCount(video.id);

          return res.json({
            free: true,
            accessToken,
            videoId: video.id,
          });
        }
      } else {
        amountInCents = video.priceInCents || 0;
        if (amountInCents < 50) {
          return res.status(400).json({ error: "Video price is not set correctly" });
        }
      }

      // Get video owner's Stripe Connect account
      const videoOwner = await storage.getUser(video.userId);
      let connectedAccountId: string | undefined;
      let applicationFeeAmount = 0;

      if (videoOwner?.stripeConnectAccountId && videoOwner?.stripeConnectOnboardingComplete) {
        try {
          const isReady = await isAccountReady(videoOwner.stripeConnectAccountId);
          if (isReady) {
            connectedAccountId = videoOwner.stripeConnectAccountId;
            applicationFeeAmount = calculatePlatformFee(amountInCents);
          }
        } catch (err) {
          console.warn("[VIDEO CHECKOUT] Failed to check Connect account status:", err);
        }
      }

      const session = await createVideoCheckoutSession({
        videoId: video.id,
        videoTitle: video.title,
        artistName: landingPage.artistName,
        priceInCents: amountInCents,
        pricingType: isPWYW ? 'pwyw' : 'fixed',
        customAmountCents: isPWYW ? amountInCents : undefined,
        buyerEmail,
        landingPageSlug: landingPage.slug,
        baseUrl: getBaseUrl(req),
        currency: video.currency || 'gbp',
        connectedAccountId,
        applicationFeeAmount,
      });

      res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Video checkout creation error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify video purchase and get access token
  app.get("/api/videos/purchase/verify", async (req: Request, res: Response) => {
    try {
      const { session_id } = req.query;
      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Session ID required" });
      }

      const session = await getCheckoutSessionStripe(session_id);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      // Check if purchase already recorded
      const existingPurchase = await storage.getVideoPurchaseBySession(session_id);
      if (existingPurchase) {
        return res.json({
          success: true,
          accessToken: existingPurchase.accessToken,
          videoId: existingPurchase.videoId,
        });
      }

      // Extract details and create purchase record
      const details = extractVideoPurchaseDetails(session);
      if (!details.videoId) {
        return res.status(400).json({ error: "Invalid purchase session" });
      }

      const accessToken = crypto.randomBytes(32).toString('hex');
      const accessExpires = new Date();
      accessExpires.setDate(accessExpires.getDate() + 30);

      const purchase = await storage.createVideoPurchase({
        videoId: details.videoId,
        buyerEmail: details.buyerEmail,
        buyerName: details.buyerName || null,
        stripePaymentIntentId: details.paymentIntentId || null,
        stripeCheckoutSessionId: session_id,
        amountPaidCents: details.amountPaid,
        currency: details.currency,
        accessToken,
        accessExpiresAt: accessExpires,
        status: 'completed',
      });

      await storage.incrementVideoPurchaseCount(details.videoId);

      // Send purchase receipt and artist notification emails (async, don't block response)
      const video = await storage.getArtistVideo(details.videoId);
      if (video) {
        const landingPage = await storage.getLandingPage(video.landingPageId);
        const artistName = landingPage?.artistName || 'Unknown Artist';
        const baseUrl = getBaseUrl(req);

        console.log('[VIDEO PURCHASE] Sending receipt email to:', details.buyerEmail);

        sendVideoPurchaseReceiptEmail({
          buyerEmail: details.buyerEmail,
          buyerName: details.buyerName || '',
          videoTitle: video.title,
          artistName,
          amountPaidCents: details.amountPaid,
          currency: details.currency,
          accessToken,
          accessExpiresAt: accessExpires,
          videoId: video.id,
          landingPageSlug: landingPage?.slug || '',
          baseUrl,
        }).then(result => {
          console.log('[VIDEO PURCHASE] Receipt email result:', result);
        }).catch(err => console.error('[VIDEO PURCHASE] Failed to send receipt email:', err));

        // Notify the artist about the sale
        const artist = await storage.getUser(video.userId);
        if (artist?.email) {
          const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT || '0', 10);
          const platformFee = Math.round((details.amountPaid * platformFeePercent) / 100);
          const artistEarnings = details.amountPaid - platformFee;

          console.log('[VIDEO PURCHASE] Sending artist notification to:', artist.email);

          sendVideoSoldNotificationEmail(
            artist.email,
            artist.name,
            video.title,
            details.buyerName || details.buyerEmail,
            artistEarnings,
            details.currency
          ).then(result => {
            console.log('[VIDEO PURCHASE] Artist notification result:', result);
          }).catch(err => console.error('[VIDEO PURCHASE] Failed to send artist notification:', err));
        }
      }

      res.json({
        success: true,
        accessToken: purchase.accessToken,
        videoId: purchase.videoId,
      });
    } catch (error) {
      console.error("Video purchase verify error:", error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  // ============================================
  // TRACK SPLITS ROUTES (Collaboration Verification)
  // ============================================

  // Get splits for a track (owner only)
  app.get("/api/tracks/:trackId/splits", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.trackId);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const splits = await storage.getTrackSplitsByTrack(track.id);
      res.json({
        trackId: track.id,
        splits,
        ownerSplitPercentage: track.ownerSplitPercentage || 100,
        splitsConfigured: track.splitsConfigured || false,
        splitsVerified: track.splitsVerified || false,
        autoPublishAt: track.autoPublishAt,
      });
    } catch (error) {
      console.error("Get track splits error:", error);
      res.status(500).json({ error: "Failed to get track splits" });
    }
  });

  // Create/update splits for a track
  app.post("/api/tracks/:trackId/splits", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.trackId);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const { splits, ownerSplitPercentage, producerAgreementData } = req.body as {
        splits: Array<{
          collaboratorName: string;
          collaboratorEmail: string;
          collaboratorRole?: string;
          splitPercentage: number;
        }>;
        ownerSplitPercentage: number;
        producerAgreementData?: Record<string, unknown>;
      };

      // Validate splits
      if (!Array.isArray(splits)) {
        return res.status(400).json({ error: "Splits must be an array" });
      }

      // Validate percentages add up to 100
      const totalCollaboratorPercentage = splits.reduce((sum, s) => sum + s.splitPercentage, 0);
      const totalPercentage = ownerSplitPercentage + totalCollaboratorPercentage;

      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          error: `Split percentages must add up to 100%. Currently: ${totalPercentage.toFixed(2)}%`
        });
      }

      // Validate each split
      for (const split of splits) {
        if (!split.collaboratorName || !split.collaboratorEmail || !split.splitPercentage) {
          return res.status(400).json({ error: "Each split must have name, email, and percentage" });
        }
        if (split.splitPercentage <= 0 || split.splitPercentage > 100) {
          return res.status(400).json({ error: "Split percentage must be between 0 and 100" });
        }
      }

      // Delete existing splits for this track
      await storage.deleteTrackSplitsByTrack(track.id);

      // Create new splits
      const now = new Date();
      const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      const createdSplits = [];

      for (const split of splits) {
        // Check if collaborator is already registered
        const existingUser = await storage.getUserByEmail(split.collaboratorEmail.toLowerCase());

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newSplit = await storage.createTrackSplit({
          trackId: track.id,
          collaboratorName: split.collaboratorName,
          collaboratorEmail: split.collaboratorEmail,
          collaboratorRole: split.collaboratorRole || 'artist',
          splitPercentage: split.splitPercentage,
          collaboratorUserId: existingUser?.id || null,
          stripeConnectAccountId: existingUser?.stripeConnectAccountId || null,
          status: 'pending',
          verificationToken,
          verificationSentAt: now,
          verificationDeadline: deadline,
        });

        createdSplits.push(newSplit);

        // Send verification email
        try {
          const user = await storage.getUser(userId);
          const { sendSplitVerificationEmail } = await import("./services/postmark");
          await sendSplitVerificationEmail({
            to: split.collaboratorEmail,
            collaboratorName: split.collaboratorName,
            artistName: user?.name || track.artistName || 'An artist',
            trackTitle: track.title,
            splitPercentage: split.splitPercentage,
            verificationToken,
            deadline,
            isExistingUser: !!existingUser,
            baseUrl: getBaseUrl(req),
          });
        } catch (emailError) {
          console.error("Failed to send split verification email:", emailError);
        }
      }

      // Handle producer license agreements if producerAgreementData is provided
      if (producerAgreementData) {
        const producerCreatedSplits = createdSplits.filter(
          (s: any) => (s.collaboratorRole || 'artist') === 'producer'
        );

        if (producerCreatedSplits.length > 0) {
          try {
            // Look up the Conditional License Agreement template by name
            const [template] = await db
              .select()
              .from(contractTemplates)
              .where(eq(contractTemplates.name, 'Conditional License Agreement'))
              .limit(1);

            if (!template) {
              console.error("[SPLITS] Conditional License Agreement template not found in database");
            } else {
              const initiator = await storage.getUser(userId);
              const initiatorName = initiator?.name || initiator?.email || 'Artist';
              const baseUrl = getBaseUrl(req);

              for (const producerSplit of producerCreatedSplits) {
                try {
                  // Create contract record
                  const contractName = `Conditional License - ${track.title} - ${producerSplit.collaboratorName}`;
                  const contract = await storage.createContract({
                    userId,
                    name: contractName,
                    type: 'production',
                    status: 'pending_signature',
                    partnerName: producerSplit.collaboratorName,
                    templateId: template.id,
                    templateData: producerAgreementData as any,
                    renderedContent: null,
                  } as any);

                  // Generate HTML content from template
                  // Merge context data (artist, producer, track info) with form data
                  const formFields = producerAgreementData as Record<string, string | number | Date | null>;
                  // Clear recoup-specific fields when perpetual licence is selected
                  if (formFields.licence_structure === 'perpetual') {
                    formFields.licence_fee_amount = '';
                    formFields.post_recoup_producer_split = '';
                    formFields.post_recoup_artist_split = '';
                  }
                  const templateFormData: TemplateFormData = {
                    fields: {
                      ...formFields,
                      artist_legal_name: initiatorName,
                      artist_stage_name: initiator?.name || '',
                      artist_email: initiator?.email || '',
                      producer_legal_name: producerSplit.collaboratorName,
                      producer_stage_name: producerSplit.collaboratorName,
                      producer_email: producerSplit.collaboratorEmail,
                      track_title: track.title,
                      track_version: track.version && track.version > 1 ? `v${track.version}` : 'Original',
                      producer_split_percent: producerSplit.splitPercentage,
                      artist_split_percent: ownerSplitPercentage,
                    },
                    enabledClauses: [],
                  };
                  const templateForRender = {
                    content: template.content as TemplateContent,
                    optionalClauses: (template.optionalClauses || []) as OptionalClause[],
                  };
                  const rendered = renderTemplateContent(templateForRender, templateFormData);
                  const renderedContent = generateHTML(rendered.title, rendered.sections);
                  await storage.updateContract(contract.id, { renderedContent } as any);

                  // Generate PDF with signature areas (2 signers: artist + producer)
                  const contractForPdf = { ...contract, renderedContent };
                  const pdfResult = await generateContractPDFWithSignatureAreas(contractForPdf, 2);

                  // Upload to DocuSeal
                  let docusealService;
                  try {
                    docusealService = getDocuSealService();
                  } catch (err) {
                    console.error('[SPLITS] DocuSeal not configured, skipping e-sign for producer:', producerSplit.collaboratorEmail);
                    // Still link the contract to the split
                    await db.update(trackSplits)
                      .set({ contractId: contract.id })
                      .where(eq(trackSplits.id, producerSplit.id));
                    continue;
                  }

                  const filename = `${contractName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
                  const docusealDoc = await docusealService.uploadDocument(pdfResult.buffer, filename);

                  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

                  // Create batch signature request with two signers (parallel — both can sign independently)
                  const signerList = [
                    { signerName: initiatorName, signerEmail: initiator!.email.toLowerCase(), signingOrder: 1 },
                    { signerName: producerSplit.collaboratorName, signerEmail: producerSplit.collaboratorEmail.toLowerCase(), signingOrder: 1 },
                  ];

                  const batchResponse = await docusealService.createBatchSignatureRequests({
                    documentId: docusealDoc.id,
                    signers: signerList.map((s, i) => ({
                      ...s,
                      signaturePosition: pdfResult.signaturePositions[i] ? {
                        page: pdfResult.signaturePositions[i].page,
                        x: pdfResult.signaturePositions[i].x,
                        y: pdfResult.signaturePositions[i].y,
                        width: pdfResult.signaturePositions[i].width,
                        height: pdfResult.signaturePositions[i].height,
                      } : undefined,
                    })),
                    expiresAt: expiresAt.toISOString(),
                    completedRedirectUrl: `${process.env.APP_URL}/dashboard?tab=contracts`,
                  });

                  // Create local signature request record
                  const [signatureRequest] = await db
                    .insert(signatureRequests)
                    .values({
                      contractId: contract.id,
                      initiatorId: userId,
                      docusealDocumentId: String(docusealDoc.id),
                      status: 'pending',
                      signingOrder: 'parallel',
                      expiresAt,
                    })
                    .returning();

                  // Create signatory records
                  console.log(`[SPLITS] DocuSeal batch response:`, JSON.stringify(batchResponse, null, 2));
                  const signatoryRecords = await Promise.all(
                    batchResponse.signatureRequests.map(async (sr: any, index: number) => {
                      const signerInput = signerList[index];
                      const existingSigner = await storage.getUserByEmail(signerInput.signerEmail);

                      const resolvedSigningUrl = sr.signingUrl || sr.signing_url || sr.embed_src || '';
                      // Extract slug from signing URL as fallback token (e.g. /sign/sign_xxx → sign_xxx)
                      const slugFromUrl = resolvedSigningUrl.split('/').pop() || '';
                      const [signatory] = await db
                        .insert(signatories)
                        .values({
                          signatureRequestId: signatureRequest.id,
                          docusealRequestId: sr.id,
                          signingToken: sr.signingToken || sr.slug || slugFromUrl || crypto.randomUUID(),
                          signingUrl: resolvedSigningUrl,
                          email: signerInput.signerEmail,
                          name: signerInput.signerName,
                          userId: existingSigner?.id || null,
                          signingOrder: sr.signingOrder,
                          status: 'pending',
                        })
                        .returning();

                      return signatory;
                    })
                  );

                  // Update split record with contract and signature request references
                  await db.update(trackSplits)
                    .set({
                      contractId: contract.id,
                      signatureRequestId: signatureRequest.id,
                    })
                    .where(eq(trackSplits.id, producerSplit.id));

                  // Send signature request emails to pending signatories
                  for (const signatory of signatoryRecords) {
                    if (signatory.status === 'pending' && signatory.signingUrl) {
                      try {
                        const contractDownloadUrl = signatory.signingToken
                          ? `${baseUrl}/api/signatures/contract/${signatory.signingToken}`
                          : null;
                        await sendSignatureRequestEmail(
                          signatory.email,
                          signatory.name,
                          initiatorName,
                          contractName,
                          signatory.signingUrl,
                          `Conditional License Agreement for "${track.title}"`,
                          contractDownloadUrl
                        );
                        console.log(`[SPLITS] Producer license e-sign email sent to ${signatory.email}`);
                      } catch (emailError) {
                        console.error(`[SPLITS] Failed to send e-sign email to ${signatory.email}:`, emailError);
                      }
                    }
                  }

                  console.log(`[SPLITS] Producer license agreement created for ${producerSplit.collaboratorName}: contract=${contract.id}, sigRequest=${signatureRequest.id}`);
                } catch (producerError) {
                  console.error(`[SPLITS] Failed to create producer license agreement for ${producerSplit.collaboratorName}:`, producerError);
                  // Continue — split creation still succeeds even if e-signing fails
                }
              }
            }
          } catch (templateError) {
            console.error("[SPLITS] Error processing producer agreements:", templateError);
            // Non-fatal: splits are already created
          }
        }
      }

      // Update track with split info
      await storage.updateTrack(track.id, {
        splitsConfigured: true,
        splitsVerified: false,
        ownerSplitPercentage,
        splitsSubmittedAt: now,
        autoPublishAt: deadline,
      });

      res.json({
        trackId: track.id,
        splits: createdSplits,
        ownerSplitPercentage,
        splitsConfigured: true,
        splitsVerified: false,
        autoPublishAt: deadline,
      });
    } catch (error) {
      console.error("Create track splits error:", error);
      res.status(500).json({ error: "Failed to create track splits" });
    }
  });

  // Delete a specific split
  app.delete("/api/tracks/:trackId/splits/:splitId", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.trackId);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const split = await storage.getTrackSplit(req.params.splitId);
      if (!split || split.trackId !== track.id) {
        return res.status(404).json({ error: "Split not found" });
      }

      await storage.deleteTrackSplit(split.id);

      // Recalculate verification status
      const allVerified = await storage.checkAllSplitsVerifiedOrExpired(track.id);
      await storage.updateTrack(track.id, { splitsVerified: allVerified });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete track split error:", error);
      res.status(500).json({ error: "Failed to delete split" });
    }
  });

  // Resend verification email for a split
  app.post("/api/tracks/:trackId/splits/:splitId/resend", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const track = await storage.getTrack(req.params.trackId);
      if (!track || track.userId !== userId) {
        return res.status(404).json({ error: "Track not found" });
      }

      const split = await storage.getTrackSplit(req.params.splitId);
      if (!split || split.trackId !== track.id) {
        return res.status(404).json({ error: "Split not found" });
      }

      if (split.status !== 'pending') {
        return res.status(400).json({ error: "Can only resend for pending splits" });
      }

      // Send verification email
      const user = await storage.getUser(userId);
      const existingUser = await storage.getUserByEmail(split.collaboratorEmail);
      const { sendSplitVerificationEmail } = await import("./services/postmark");

      await sendSplitVerificationEmail({
        to: split.collaboratorEmail,
        collaboratorName: split.collaboratorName,
        artistName: user?.name || track.artistName || 'An artist',
        trackTitle: track.title,
        splitPercentage: split.splitPercentage,
        verificationToken: split.verificationToken!,
        deadline: split.verificationDeadline!,
        isExistingUser: !!existingUser,
        baseUrl: getBaseUrl(req),
      });

      // Update reminder count
      await storage.updateTrackSplit(split.id, {
        reminderSentCount: (split.reminderSentCount || 0) + 1,
        lastReminderSentAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Resend split verification error:", error);
      res.status(500).json({ error: "Failed to resend verification" });
    }
  });

  // Get split verification details (public - for verification page)
  app.get("/api/splits/verify/:token", async (req: Request, res: Response) => {
    try {
      const split = await storage.getTrackSplitByToken(req.params.token);
      if (!split) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }

      const track = await storage.getTrack(split.trackId);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      const trackOwner = await storage.getUser(track.userId);
      const existingUser = split.collaboratorUserId
        ? await storage.getUser(split.collaboratorUserId)
        : await storage.getUserByEmail(split.collaboratorEmail);

      res.json({
        id: split.id,
        trackTitle: track.title,
        artistName: trackOwner?.name || track.artistName || 'Unknown Artist',
        collaboratorName: split.collaboratorName,
        collaboratorEmail: split.collaboratorEmail,
        collaboratorRole: split.collaboratorRole,
        splitPercentage: split.splitPercentage,
        deadline: split.verificationDeadline,
        status: split.status,
        isExistingUser: !!existingUser,
        hasStripeConnect: !!(existingUser?.stripeConnectAccountId && existingUser?.stripeConnectOnboardingComplete),
      });
    } catch (error) {
      console.error("Get split verification error:", error);
      res.status(500).json({ error: "Failed to get verification details" });
    }
  });

  // Accept a split (can be authenticated or create account)
  app.post("/api/splits/verify/:token/accept", async (req: Request, res: Response) => {
    try {
      const split = await storage.getTrackSplitByToken(req.params.token);
      if (!split) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }

      if (split.status !== 'pending') {
        return res.status(400).json({ error: `Split has already been ${split.status}` });
      }

      // Check if deadline passed
      if (split.verificationDeadline && new Date() > new Date(split.verificationDeadline)) {
        await storage.updateTrackSplit(split.id, { status: 'expired' });
        return res.status(400).json({ error: "Verification deadline has passed" });
      }

      const userId = (req.session as any).userId;
      let collaboratorUser = userId ? await storage.getUser(userId) : null;

      // If not logged in, check if user with this email exists
      if (!collaboratorUser) {
        collaboratorUser = await storage.getUserByEmail(split.collaboratorEmail);
      }

      // Handle account creation if needed
      if (!collaboratorUser && req.body.createAccount) {
        const { name, password } = req.body.createAccount;
        if (!name || !password) {
          return res.status(400).json({ error: "Name and password required to create account" });
        }

        const hashedPassword = await hashPassword(password);

        collaboratorUser = await storage.createUser({
          email: split.collaboratorEmail,
          name,
          password: hashedPassword,
          emailVerified: true, // Auto-verify since they clicked the email link
        });
      }

      if (!collaboratorUser) {
        return res.status(400).json({
          error: "Please log in or create an account to accept this split",
          requiresAuth: true,
        });
      }

      // Verify the logged-in user's email matches the split
      if (collaboratorUser.email.toLowerCase() !== split.collaboratorEmail.toLowerCase()) {
        return res.status(403).json({
          error: "This split is for a different email address",
        });
      }

      // Update split as verified
      await storage.updateTrackSplit(split.id, {
        status: 'verified',
        verifiedAt: new Date(),
        collaboratorUserId: collaboratorUser.id,
        stripeConnectAccountId: collaboratorUser.stripeConnectAccountId || null,
      });

      // Check if all splits are now verified/expired
      const track = await storage.getTrack(split.trackId);
      if (track) {
        const allVerified = await storage.checkAllSplitsVerifiedOrExpired(track.id);
        if (allVerified) {
          await storage.updateTrack(track.id, { splitsVerified: true });

          // Notify track owner that all splits are verified
          const trackOwner = await storage.getUser(track.userId);
          if (trackOwner) {
            try {
              const { sendAllSplitsVerifiedEmail } = await import("./services/postmark");
              await sendAllSplitsVerifiedEmail({
                to: trackOwner.email,
                artistName: trackOwner.name,
                trackTitle: track.title,
                baseUrl: getBaseUrl(req),
              });
            } catch (emailError) {
              console.error("Failed to send all splits verified email:", emailError);
            }
          }
        } else {
          // Notify track owner about this verification
          const trackOwner = await storage.getUser(track.userId);
          if (trackOwner) {
            try {
              const { sendSplitVerifiedNotificationEmail } = await import("./services/postmark");
              await sendSplitVerifiedNotificationEmail({
                to: trackOwner.email,
                artistName: trackOwner.name,
                trackTitle: track.title,
                collaboratorName: split.collaboratorName,
              });
            } catch (emailError) {
              console.error("Failed to send split verified notification:", emailError);
            }
          }
        }
      }

      res.json({
        success: true,
        needsStripeConnect: !collaboratorUser.stripeConnectAccountId || !collaboratorUser.stripeConnectOnboardingComplete,
      });
    } catch (error) {
      console.error("Accept split error:", error);
      res.status(500).json({ error: "Failed to accept split" });
    }
  });

  // Reject a split
  app.post("/api/splits/verify/:token/reject", async (req: Request, res: Response) => {
    try {
      const split = await storage.getTrackSplitByToken(req.params.token);
      if (!split) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }

      if (split.status !== 'pending') {
        return res.status(400).json({ error: `Split has already been ${split.status}` });
      }

      const { reason } = req.body;

      // Update split as rejected
      await storage.updateTrackSplit(split.id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      });

      // Notify track owner
      const track = await storage.getTrack(split.trackId);
      if (track) {
        const trackOwner = await storage.getUser(track.userId);
        if (trackOwner) {
          try {
            const { sendSplitRejectedNotificationEmail } = await import("./services/postmark");
            await sendSplitRejectedNotificationEmail({
              to: trackOwner.email,
              artistName: trackOwner.name,
              trackTitle: track.title,
              collaboratorName: split.collaboratorName,
              reason: reason || 'No reason provided',
            });
          } catch (emailError) {
            console.error("Failed to send split rejected notification:", emailError);
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Reject split error:", error);
      res.status(500).json({ error: "Failed to reject split" });
    }
  });

  // Process expired split deadlines (internal/cron endpoint)
  app.post("/api/internal/splits/process-deadlines", async (req: Request, res: Response) => {
    try {
      // This could be protected by an API key in production
      const apiKey = req.headers['x-api-key'];
      if (process.env.INTERNAL_API_KEY && apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const now = new Date();
      const expiredSplits = await storage.getPendingSplitsByDeadline(now);

      let processed = 0;
      const trackUpdates = new Set<string>();

      for (const split of expiredSplits) {
        await storage.updateTrackSplit(split.id, { status: 'expired' });
        trackUpdates.add(split.trackId);
        processed++;

        // Send expiration notification to collaborator
        try {
          const track = await storage.getTrack(split.trackId);
          if (track) {
            const { sendSplitExpiredEmail } = await import("./services/postmark");
            await sendSplitExpiredEmail({
              to: split.collaboratorEmail,
              collaboratorName: split.collaboratorName,
              trackTitle: track.title,
            });
          }
        } catch (emailError) {
          console.error("Failed to send split expired email:", emailError);
        }
      }

      // Update track verification status for affected tracks
      for (const trackId of Array.from(trackUpdates)) {
        const allVerified = await storage.checkAllSplitsVerifiedOrExpired(trackId);
        if (allVerified) {
          await storage.updateTrack(trackId, { splitsVerified: true });
        }
      }

      res.json({ success: true, processed });
    } catch (error) {
      console.error("Process deadlines error:", error);
      res.status(500).json({ error: "Failed to process deadlines" });
    }
  });

  // ============================================
  // BILLING ROUTES (Epic 5)
  // ============================================

  // Note: Uses requireAuth imported from ./middleware/auth which properly sets req.user

  // Create checkout session
  app.post("/api/billing/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { tier = 'beta' } = req.body as { tier?: 'beta' | 'alpha' };

      // Validate tier
      if (tier !== 'beta' && tier !== 'alpha') {
        return res.status(400).json({ error: "Invalid tier. Must be 'beta' or 'alpha'" });
      }

      // Dynamic import to avoid module load issues when Stripe key not set
      const stripe = await import("./services/stripe");

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if already subscribed - redirect to upgrade endpoint instead
      if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
        return res.status(400).json({
          error: "You already have an active subscription. Use the upgrade endpoint to change tiers.",
          redirect: "/settings/billing",
        });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if needed
      if (!customerId) {
        const customer = await stripe.createCustomer(user.email, {
          userId: user.id,
          name: user.name,
        });
        customerId = customer.id;

        // Save customer ID to user
        await storage.updateUser(userId, {
          stripeCustomerId: customerId,
        } as any);
      }

      // Create checkout session with tier
      const baseUrl = getBaseUrl(req);
      const session = await stripe.createCheckoutSession({
        customerId,
        userId: user.id,
        tier,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/pricing?canceled=true`,
      });

      console.log(`[BILLING] Checkout session created: ${session.id} for user ${userId}`);

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error("[BILLING] Checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify checkout success (supports both authenticated users and Payment Link redirects)
  app.get("/api/billing/checkout/verify/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Dynamic import
      const { stripe } = await import("./services/stripe");
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Get user ID from session (metadata.userId for API sessions, client_reference_id for Payment Links)
      const sessionUserId = session.metadata?.userId || session.client_reference_id;

      if (!sessionUserId) {
        return res.status(400).json({ error: "No user ID associated with this session" });
      }

      // If user is authenticated, verify session belongs to them
      if (req.user && req.user.id !== sessionUserId) {
        return res.status(403).json({ error: "Session does not belong to this user" });
      }

      // Check payment status
      if (session.payment_status !== "paid") {
        return res.status(400).json({
          success: false,
          status: session.payment_status,
          message: "Payment not completed",
        });
      }

      // Payment confirmed - ensure user subscription is updated
      // This handles race conditions where webhook might not have completed yet
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (subscriptionId) {
        const stripeModule = await import("./services/stripe");
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = session.metadata?.tier || stripeModule.priceIdToTier(priceId);

        await storage.updateUser(sessionUserId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: subscription.status === 'active' || subscription.status === 'trialing' ? subscription.status : 'active',
          subscriptionPriceId: priceId || null,
          subscriptionCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
          subscriptionTier: tier,
        } as any);
        console.log(`[BILLING] Synced subscription ${subscriptionId} for user ${sessionUserId}: ${tier}`);
      }

      res.json({
        success: true,
        status: "paid",
        subscriptionId: session.subscription,
        customerId: session.customer,
      });
    } catch (error) {
      console.error("[BILLING] Verify checkout error:", error);
      res.status(500).json({ error: "Failed to verify checkout session" });
    }
  });

  // Preview upgrade proration (Story 12-8)
  app.post("/api/subscriptions/preview-upgrade", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { targetTier } = req.body as { targetTier: 'alpha' };

      if (targetTier !== 'alpha') {
        return res.status(400).json({ error: "Can only preview upgrade to alpha" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const stripeModule = await import("./services/stripe");
      const { stripe } = stripeModule;

      // Get current subscription
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const newPriceId = stripeModule.tierToPriceId('alpha');

      // Preview proration - calculate estimate based on price difference
      // The full Stripe proration preview requires more complex API calls
      // For simplicity, return a calculated estimate
      const currentPriceAmount = 9.99; // Beta price
      const newPriceAmount = 19.99; // Alpha price
      const daysInMonth = 30;
      const sub = subscription as any;
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date();
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const dailyDifference = (newPriceAmount - currentPriceAmount) / daysInMonth;
      const proratedAmount = Math.round(dailyDifference * daysRemaining * 100) / 100;

      res.json({
        amountDue: proratedAmount,
        currency: 'gbp',
        newPlanAmount: newPriceAmount,
      });
    } catch (error) {
      console.error("[BILLING] Preview upgrade error:", error);
      res.status(500).json({ error: "Failed to preview upgrade" });
    }
  });

  // Upgrade subscription tier (Story 12-8)
  app.post("/api/subscriptions/upgrade", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { targetTier } = req.body as { targetTier: 'alpha' };

      if (targetTier !== 'alpha') {
        return res.status(400).json({ error: "Can only upgrade to alpha" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription to upgrade" });
      }

      if (user.subscriptionTier === 'alpha') {
        return res.status(400).json({ error: "Already on alpha tier" });
      }

      const stripeModule = await import("./services/stripe");
      const { stripe } = stripeModule;

      // Get current subscription
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const newPriceId = stripeModule.tierToPriceId('alpha');

      // Update subscription with new price
      const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'always_invoice',
        metadata: {
          ...subscription.metadata,
          tier: 'alpha',
        },
      });

      // Update user tier immediately
      await storage.updateUser(userId, {
        subscriptionTier: 'alpha',
        subscriptionPriceId: newPriceId,
      } as any);

      console.log(`[BILLING] Upgraded user ${userId} from ${user.subscriptionTier} to alpha`);

      res.json({
        success: true,
        tier: 'alpha',
        effectiveDate: 'immediate',
      });
    } catch (error) {
      console.error("[BILLING] Upgrade error:", error);
      res.status(500).json({ error: "Failed to upgrade subscription" });
    }
  });

  // Get contract usage (Story 12-9)
  app.get("/api/contracts/usage", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Count user's contracts
      const [result] = await db
        .select({ count: count() })
        .from(contracts)
        .where(eq(contracts.userId, userId));

      const contractCount = result?.count || 0;
      const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
      const tier = isActive ? (user.subscriptionTier || 'beta') : 'free';
      const isLimited = tier === 'free';

      res.json({
        current: contractCount,
        limit: isLimited ? FREE_TIER_LIMITS.maxContracts : null,
        isLimited,
        tier,
      });
    } catch (error) {
      console.error("[CONTRACTS] Usage error:", error);
      res.status(500).json({ error: "Failed to get contract usage" });
    }
  });

  // Get subscription status
  app.get("/api/billing/subscription", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const subscription = await getUserSubscription(userId);
      res.json(subscription);
    } catch (error) {
      console.error("[BILLING] Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  // Create Stripe Customer Portal session
  app.post("/api/billing/portal", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({
          error: "No billing account found",
          message: "You need to subscribe first to access billing management.",
        });
      }

      // Dynamic import
      const { createPortalSession, stripeConfig } = await import("./services/stripe");

      const session = await createPortalSession(
        user.stripeCustomerId,
        `${stripeConfig.appUrl}/settings/billing`
      );

      console.log(`[BILLING] Portal session created for user ${userId}`);

      res.json({
        url: session.url,
      });
    } catch (error) {
      console.error("[BILLING] Portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get invoices for current user
  app.get("/api/billing/invoices", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.json([]);
      }

      // Dynamic import
      const { listInvoices } = await import("./services/stripe");

      const invoices = await listInvoices(user.stripeCustomerId, 12);

      // Format for frontend
      const formatted = invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_paid / 100,
        currency: inv.currency,
        date: new Date((inv.created || 0) * 1000).toISOString(),
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      }));

      res.json(formatted);
    } catch (error) {
      console.error("[BILLING] Get invoices error:", error);
      res.status(500).json({ error: "Failed to get invoices" });
    }
  });

  // ============================================
  // STRIPE WEBHOOK ROUTE (Epic 5)
  // ============================================

  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      console.error("[STRIPE WEBHOOK] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    try {
      // Dynamic import
      const { constructWebhookEvent } = await import("./services/stripe");
      const { handleStripeEvent } = await import("./services/stripe-webhook-handlers");

      // Use rawBody for signature verification
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        console.error("[STRIPE WEBHOOK] No raw body available");
        return res.status(400).json({ error: "No raw body" });
      }

      // Verify and construct event
      const event = constructWebhookEvent(rawBody, signature);

      console.log(`[STRIPE WEBHOOK] Received: ${event.type} (${event.id})`);

      // Process event
      await handleStripeEvent(event);

      // Acknowledge receipt
      res.json({ received: true, eventId: event.id });
    } catch (error) {
      if ((error as Error).message?.includes("signature")) {
        console.error("[STRIPE WEBHOOK] Signature verification failed");
        return res.status(400).json({ error: "Invalid signature" });
      }

      console.error("[STRIPE WEBHOOK] Error processing event:", error);
      // Return 200 to prevent retries for processing errors we've logged
      res.status(200).json({ received: true, error: "Processing error logged" });
    }
  });

  // Admin Routes - Protected by requireAdmin middleware
  
  // Admin test email endpoint
  app.post("/api/admin/test-email", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const targetEmail = email || req.user?.email;
      
      if (!targetEmail) {
        return res.status(400).json({ error: "Email address required" });
      }
      
      // Import postmark client status check
      const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
      
      if (!POSTMARK_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          error: "POSTMARK_API_KEY not configured",
          configured: false 
        });
      }
      
      // Use a simple test email via postmark
      const postmark = await import('postmark');
      const client = new postmark.ServerClient(POSTMARK_API_KEY);
      
      const result = await client.sendEmail({
        From: process.env.FROM_EMAIL || 'noreply@aermuse.com',
        To: targetEmail,
        Subject: 'Aermuse Email Test - Success!',
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #660033;">Email Service Test Successful</h2>
            <p>This is a test email from your Aermuse application.</p>
            <p>If you received this email, your Postmark integration is working correctly!</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
            <p style="color: #660033; font-weight: bold;">- The Aermuse Team</p>
          </div>
        `,
        TextBody: `
Email Service Test Successful

This is a test email from your Aermuse application.
If you received this email, your Postmark integration is working correctly!

Sent at: ${new Date().toISOString()}

- The Aermuse Team
        `,
        MessageStream: 'outbound'
      });
      
      console.log(`[EMAIL] Test email sent to ${targetEmail}, MessageID: ${result.MessageID}`);
      res.json({ 
        success: true, 
        messageId: result.MessageID,
        sentTo: targetEmail,
        configured: true
      });
    } catch (error) {
      console.error("[EMAIL] Test email failed:", error);
      res.status(500).json({ 
        success: false, 
        error: String(error),
        configured: true
      });
    }
  });

  // Placeholder admin stats endpoint (full implementation in Epic 6)
  app.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(u => !u.deletedAt);
      const adminCount = users.filter(u => u.role === 'admin' && !u.deletedAt).length;

      res.json({
        totalUsers: activeUsers.length,
        adminCount,
        // More stats will be added in Epic 6
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });

  // Admin users list
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users
        .filter(u => !u.deletedAt)
        .map(({ password, ...user }) => user);

      res.json(safeUsers);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Admin update user (role change)
  app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (role && !['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
      }

      const user = await storage.getUser(id);
      if (!user || user.deletedAt) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await storage.updateUser(id, { role } as any);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "user_role_change",
        entityType: "user",
        entityId: id,
        details: { oldRole: user.role, newRole: role, userEmail: user.email },
        req,
      });

      const { password, ...safeUser } = updated;
      console.log(`[ADMIN] User ${id} role changed to ${role} by ${(req.session as any).userId}`);
      res.json(safeUser);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin update user subscription tier
  app.patch("/api/admin/users/:id/tier", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tier } = req.body;

      if (!tier || !['free', 'beta', 'alpha', 'theta'].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier. Must be 'free', 'beta', 'alpha', or 'theta'" });
      }

      const user = await storage.getUser(id);
      if (!user || user.deletedAt) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await storage.updateUser(id, { subscriptionTier: tier } as any);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update user tier" });
      }

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "user_tier_change",
        entityType: "user",
        entityId: id,
        details: { oldTier: user.subscriptionTier, newTier: tier, userEmail: user.email },
        req,
      });

      const { password, ...safeUser } = updated;
      console.log(`[ADMIN] User ${id} tier changed to ${tier} by ${(req.session as any).userId}`);
      res.json(safeUser);
    } catch (error) {
      console.error("Admin update user tier error:", error);
      res.status(500).json({ error: "Failed to update user tier" });
    }
  });

  // Admin dashboard overview stats
  app.get("/api/admin/overview", requireAdmin, async (req: Request, res: Response) => {
    try {
      const [users, contracts] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllContracts(),
      ]);

      const activeUsers = users.filter(u => !u.deletedAt);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newUsersThisMonth = activeUsers.filter(u =>
        u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
      ).length;

      const newContractsThisMonth = contracts.filter(c =>
        c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo
      ).length;

      const activeSubscribers = activeUsers.filter(u =>
        u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trialing'
      ).length;

      res.json({
        totalUsers: activeUsers.length,
        activeSubscribers,
        totalContracts: contracts.length,
        adminCount: activeUsers.filter(u => u.role === 'admin').length,
        newUsersThisMonth,
        newContractsThisMonth,
      });
    } catch (error) {
      console.error("Admin overview error:", error);
      res.status(500).json({ error: "Failed to get overview stats" });
    }
  });

  // Admin contracts list (all users)
  app.get("/api/admin/contracts", requireAdmin, async (req: Request, res: Response) => {
    try {
      // Single efficient query for all contracts
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Admin contracts error:", error);
      res.status(500).json({ error: "Failed to get contracts" });
    }
  });

  // Contract Templates routes
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { category, search } = req.query;

      // Get active templates, optionally filtered by category
      let templates = await storage.getActiveTemplates(category as string);

      // Apply search filter in-memory for simplicity
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(searchLower) ||
          (t.description?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      // Ensure fields have group property assigned based on content sections
      const templatesWithGroups = templates.map(template => {
        const content = template.content as TemplateContent;
        const fields = template.fields as TemplateField[];
        if (content && fields) {
          return { ...template, fields: assignFieldGroups(fields, content) };
        }
        return template;
      });

      res.json({ templates: templatesWithGroups });
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Ensure fields have group property assigned based on content sections
      const content = template.content as TemplateContent;
      const fields = template.fields as TemplateField[];
      if (content && fields) {
        template.fields = assignFieldGroups(fields, content);
      }

      res.json(template);
    } catch (error) {
      console.error("Get template error:", error);
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  // Render template with form data
  app.post("/api/templates/:id/render", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const { formData } = req.body as { formData: TemplateFormData };

      // Validate form data
      const templateForValidation = {
        fields: (template.fields || []) as TemplateField[],
        optionalClauses: (template.optionalClauses || []) as OptionalClause[]
      };
      const { valid, errors } = validateFormData(templateForValidation, formData);
      if (!valid) {
        return res.status(400).json({ error: "Validation failed", errors });
      }

      // Render the template
      const templateForRender = {
        content: template.content as TemplateContent,
        optionalClauses: (template.optionalClauses || []) as OptionalClause[]
      };
      const rendered = renderTemplateContent(templateForRender, formData);

      // Generate HTML and text
      const html = generateHTML(rendered.title, rendered.sections);
      const text = generateText(rendered.title, rendered.sections);

      res.json({
        html,
        text,
        title: rendered.title
      });
    } catch (error) {
      console.error("Render template error:", error);
      res.status(500).json({ error: "Failed to render template" });
    }
  });

  // Create contract from template
  app.post("/api/contracts/from-template", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check contract limit for free users
      const limitCheck = await canCreateContract(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: "Contract limit reached. Upgrade to Premium for unlimited contracts.",
          code: "CONTRACT_LIMIT_REACHED",
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeUrl: "/pricing"
        });
      }

      const { templateId, formData, title, proposalId } = req.body as {
        templateId: string;
        formData: TemplateFormData;
        title?: string;
        proposalId?: string;
      };

      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Validate form data
      const templateForValidation = {
        fields: (template.fields || []) as TemplateField[],
        optionalClauses: (template.optionalClauses || []) as OptionalClause[]
      };
      const { valid, errors } = validateFormData(templateForValidation, formData);
      if (!valid) {
        return res.status(400).json({ error: "Validation failed", errors });
      }

      // Render the template
      const templateForRender = {
        content: template.content as TemplateContent,
        optionalClauses: (template.optionalClauses || []) as OptionalClause[]
      };
      const rendered = renderTemplateContent(templateForRender, formData);
      const html = generateHTML(rendered.title, rendered.sections);

      // Create the contract
      const contract = await storage.createContract({
        userId,
        name: title || rendered.title,
        type: template.category || 'other',
        status: 'draft',
        templateId,
        templateData: formData,
        renderedContent: html,
      });

      // If created from a proposal, link the contract to it
      if (proposalId) {
        await db
          .update(proposals)
          .set({ contractId: contract.id })
          .where(eq(proposals.id, proposalId));
        console.log(`[CONTRACT] Linked to proposal ${proposalId}`);
      }

      console.log(`[CONTRACT] Created from template ${templateId}: ${contract.id}`);
      res.json({ contract });
    } catch (error) {
      console.error("Create contract from template error:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  // Admin Template Management routes
  app.get("/api/admin/templates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json({ templates });
    } catch (error) {
      console.error("Admin get templates error:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.post("/api/admin/templates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, category, content, fields, optionalClauses, personaGroups } = req.body;

      // Validate template structure
      const validation = validateTemplateStructure({
        content: content as TemplateContent,
        fields: (fields || []) as TemplateField[],
        optionalClauses: (optionalClauses || []) as OptionalClause[]
      });

      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid template", details: validation.errors });
      }

      // Get max sort order
      const allTemplates = await storage.getAllTemplates();
      const maxSortOrder = allTemplates.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), 0);

      // Auto-assign group property to fields based on section headings
      const fieldsWithGroups = assignFieldGroups(fields || [], content as TemplateContent);

      const template = await storage.createTemplate({
        name,
        description,
        category,
        content,
        fields: fieldsWithGroups,
        optionalClauses: optionalClauses || [],
        personaGroups: personaGroups || [],
        isActive: true,
        sortOrder: maxSortOrder + 1,
        version: 1,
        createdBy: (req.session as any).userId
      });

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "template_create",
        entityType: "template",
        entityId: template.id,
        details: { templateName: name, category },
        req,
      });

      console.log(`[ADMIN] Template created: ${template.id} by ${(req.session as any).userId}`);
      res.json({ template });
    } catch (error) {
      console.error("Admin create template error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/admin/templates/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }

      const { name, description, category, content, fields, optionalClauses } = req.body;

      // Validate template structure
      const validation = validateTemplateStructure({
        content: content as TemplateContent,
        fields: (fields || []) as TemplateField[],
        optionalClauses: (optionalClauses || []) as OptionalClause[]
      });

      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid template", details: validation.errors });
      }

      // Auto-assign group property to fields based on section headings
      const fieldsWithGroups = assignFieldGroups(fields || [], content as TemplateContent);

      const template = await storage.updateTemplate(req.params.id, {
        name,
        description,
        category,
        content,
        fields: fieldsWithGroups,
        optionalClauses: optionalClauses || [],
        version: (existing.version ?? 1) + 1
      });

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "template_update",
        entityType: "template",
        entityId: req.params.id,
        details: { templateName: name, version: template?.version },
        req,
      });

      console.log(`[ADMIN] Template updated: ${template?.id} v${template?.version} by ${(req.session as any).userId}`);
      res.json({ template });
    } catch (error) {
      console.error("Admin update template error:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/admin/templates/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = await storage.deactivateTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "template_deactivate",
        entityType: "template",
        entityId: req.params.id,
        details: {},
        req,
      });

      console.log(`[ADMIN] Template deactivated: ${req.params.id} by ${(req.session as any).userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin deactivate template error:", error);
      res.status(500).json({ error: "Failed to deactivate template" });
    }
  });

  app.post("/api/admin/templates/:id/activate", requireAdmin, async (req: Request, res: Response) => {
    try {
      const template = await storage.activateTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "template_activate",
        entityType: "template",
        entityId: template.id,
        details: { templateName: template.name },
        req,
      });

      console.log(`[ADMIN] Template activated: ${template.id} by ${(req.session as any).userId}`);
      res.json({ template });
    } catch (error) {
      console.error("Admin activate template error:", error);
      res.status(500).json({ error: "Failed to activate template" });
    }
  });

  app.post("/api/admin/templates/:id/clone", requireAdmin, async (req: Request, res: Response) => {
    try {
      const original = await storage.getTemplate(req.params.id);
      if (!original) {
        return res.status(404).json({ error: "Template not found" });
      }

      const { name } = req.body;

      // Get max sort order
      const allTemplates = await storage.getAllTemplates();
      const maxSortOrder = allTemplates.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), 0);

      const cloned = await storage.createTemplate({
        name: name || `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        content: original.content,
        fields: original.fields,
        optionalClauses: original.optionalClauses,
        personaGroups: original.personaGroups || [],
        isActive: true,
        sortOrder: maxSortOrder + 1,
        version: 1,
        createdBy: (req.session as any).userId
      });

      // Log the activity
      await logAdminActivity({
        adminId: (req.session as any).userId,
        action: "template_clone",
        entityType: "template",
        entityId: cloned.id,
        details: { originalId: original.id, originalName: original.name, clonedName: cloned.name },
        req,
      });

      console.log(`[ADMIN] Template cloned: ${original.id} → ${cloned.id} by ${(req.session as any).userId}`);
      res.json({ template: cloned });
    } catch (error) {
      console.error("Admin clone template error:", error);
      res.status(500).json({ error: "Failed to clone template" });
    }
  });

  app.put("/api/admin/templates/reorder", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body as { ids: string[] };

      // Update sort order for each template
      for (let i = 0; i < ids.length; i++) {
        await storage.updateTemplate(ids[i], { sortOrder: i });
      }

      console.log(`[ADMIN] Templates reordered by ${(req.session as any).userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin reorder templates error:", error);
      res.status(500).json({ error: "Failed to reorder templates" });
    }
  });

  // ============================================
  // USER TEMPLATES ROUTES (Alpha feature)
  // ============================================

  // Get user's custom templates
  app.get("/api/user/templates", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify user has Alpha subscription
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== 'alpha') {
        return res.status(403).json({ error: "This feature requires an Alpha subscription" });
      }

      const templates = await storage.getUserTemplates(userId);
      res.json({ templates });
    } catch (error) {
      console.error("Get user templates error:", error);
      res.status(500).json({ error: "Failed to get user templates" });
    }
  });

  // Create a custom template (clone from existing template)
  app.post("/api/user/templates", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify user has Alpha subscription
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== 'alpha') {
        return res.status(403).json({ error: "This feature requires an Alpha subscription" });
      }

      const { sourceTemplateId, name, description } = req.body as {
        sourceTemplateId: string;
        name: string;
        description?: string;
      };

      if (!name?.trim()) {
        return res.status(400).json({ error: "Template name is required" });
      }

      // Get the source template
      const sourceTemplate = await storage.getTemplate(sourceTemplateId);
      if (!sourceTemplate) {
        return res.status(404).json({ error: "Source template not found" });
      }

      // Create a copy with user's customizations
      const template = await storage.createUserTemplate(userId, {
        name: name.trim(),
        description: description?.trim() || sourceTemplate.description,
        category: sourceTemplate.category,
        content: sourceTemplate.content,
        fields: sourceTemplate.fields,
        optionalClauses: sourceTemplate.optionalClauses,
        personaGroups: sourceTemplate.personaGroups,
        isActive: true,
        sortOrder: 0,
        version: 1,
      });

      console.log(`[USER TEMPLATE] Created by user ${userId}: ${template.id}`);
      res.json({ template });
    } catch (error) {
      console.error("Create user template error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update user's custom template (supports full editing for ALPHA users)
  app.put("/api/user/templates/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify user has Alpha subscription
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== 'alpha') {
        return res.status(403).json({ error: "This feature requires an Alpha subscription" });
      }

      const { name, description, content, fields, optionalClauses } = req.body as {
        name?: string;
        description?: string;
        content?: TemplateContent;
        fields?: TemplateField[];
        optionalClauses?: OptionalClause[];
      };

      const updateData: {
        name?: string;
        description?: string;
        content?: TemplateContent;
        fields?: TemplateField[];
        optionalClauses?: OptionalClause[];
      } = {};

      if (name?.trim()) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || '';

      // Validate and add content changes if provided
      if (content !== undefined) {
        // Validate content structure
        if (!content.title?.trim()) {
          return res.status(400).json({ error: "Template must have a document title" });
        }
        if (!content.sections || content.sections.length === 0) {
          return res.status(400).json({ error: "Template must have at least one section" });
        }
        // Validate each section
        for (const section of content.sections) {
          if (!section.id) {
            return res.status(400).json({ error: "Each section must have an ID" });
          }
          if (!section.heading?.trim()) {
            return res.status(400).json({ error: `Section "${section.id}" is missing a heading` });
          }
          if (!section.content?.trim()) {
            return res.status(400).json({ error: `Section "${section.heading}" is missing content` });
          }
        }
        updateData.content = content;
      }

      if (fields !== undefined) {
        // Validate fields
        const fieldIds = new Set<string>();
        for (const field of fields) {
          if (!field.id?.trim()) {
            return res.status(400).json({ error: "Each field must have an ID" });
          }
          if (!field.label?.trim()) {
            return res.status(400).json({ error: `Field "${field.id}" is missing a label` });
          }
          if (!field.type) {
            return res.status(400).json({ error: `Field "${field.id}" is missing a type` });
          }
          if (fieldIds.has(field.id)) {
            return res.status(400).json({ error: `Duplicate field ID: "${field.id}"` });
          }
          fieldIds.add(field.id);
        }
        updateData.fields = fields;
      }

      if (optionalClauses !== undefined) {
        // Validate optional clauses
        const clauseIds = new Set<string>();
        for (const clause of optionalClauses) {
          if (!clause.id?.trim()) {
            return res.status(400).json({ error: "Each clause must have an ID" });
          }
          if (!clause.name?.trim()) {
            return res.status(400).json({ error: `Clause "${clause.id}" is missing a name` });
          }
          if (clauseIds.has(clause.id)) {
            return res.status(400).json({ error: `Duplicate clause ID: "${clause.id}"` });
          }
          clauseIds.add(clause.id);
        }
        updateData.optionalClauses = optionalClauses;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const template = await storage.updateUserTemplate(userId, req.params.id, updateData);
      if (!template) {
        return res.status(404).json({ error: "Template not found or not owned by you" });
      }

      console.log(`[USER TEMPLATE] Updated by user ${userId}: ${template.id}${updateData.content ? ' (content modified)' : ''}`);
      res.json({ template });
    } catch (error) {
      console.error("Update user template error:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete user's custom template
  app.delete("/api/user/templates/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify user has Alpha subscription
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== 'alpha') {
        return res.status(403).json({ error: "This feature requires an Alpha subscription" });
      }

      const success = await storage.deleteUserTemplate(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template not found or not owned by you" });
      }

      console.log(`[USER TEMPLATE] Deleted by user ${userId}: ${req.params.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user template error:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ============================================
  // ADMIN SETTINGS ROUTES (Epic 6)
  // ============================================

  // Default settings values
  const DEFAULT_SETTINGS = {
    'ai.daily_limit_free': 0,
    'ai.daily_limit_premium': 100,
    'signature.default_expiry_days': 30,
    'email.notifications_enabled': true,
  };

  // Helper to get a setting value
  async function getSettingValue<T>(key: string): Promise<T | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    if (setting) {
      return setting.value as T;
    }
    return (DEFAULT_SETTINGS as any)[key];
  }

  // GET /api/admin/settings - Get all system settings
  app.get("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(systemSettings);

      // Merge with defaults
      const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };
      for (const setting of settings) {
        settingsMap[setting.key] = setting.value;
      }

      res.json(settingsMap);
    } catch (error) {
      console.error("Admin get settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  // PUT /api/admin/settings - Update system settings
  app.put("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const updates = req.body as Record<string, any>;

      // Validate settings
      const validKeys = Object.keys(DEFAULT_SETTINGS);
      const invalidKeys = Object.keys(updates).filter(k => !validKeys.includes(k));
      if (invalidKeys.length > 0) {
        return res.status(400).json({ error: `Invalid setting keys: ${invalidKeys.join(', ')}` });
      }

      // Upsert each setting
      for (const [key, value] of Object.entries(updates)) {
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));

        if (existing) {
          await db.update(systemSettings)
            .set({ value, updatedAt: new Date(), updatedBy: userId })
            .where(eq(systemSettings.key, key));
        } else {
          await db.insert(systemSettings).values({
            key,
            value,
            updatedBy: userId,
          });
        }
      }

      // Log the activity
      await logAdminActivity({
        adminId: userId,
        action: "settings_update",
        entityType: "settings",
        entityId: null,
        details: { updatedKeys: Object.keys(updates), values: updates },
        req,
      });

      console.log(`[ADMIN] Settings updated by ${userId}:`, Object.keys(updates));

      // Return updated settings
      const settings = await db.select().from(systemSettings);
      const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };
      for (const setting of settings) {
        settingsMap[setting.key] = setting.value;
      }

      res.json(settingsMap);
    } catch (error) {
      console.error("Admin update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============================================
  // ADMIN ACTIVITY LOG ROUTES
  // ============================================

  // GET /api/admin/activity - Get activity logs with pagination and filtering
  app.get("/api/admin/activity", requireAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const adminId = req.query.adminId as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const result = await getActivityLogs({
        page,
        limit,
        action,
        entityType,
        adminId,
        dateFrom,
        dateTo,
      });

      res.json(result);
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({ error: "Failed to get activity logs" });
    }
  });

  // GET /api/admin/activity/actions - Get available action types for filtering
  app.get("/api/admin/activity/actions", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const actions = await getAvailableActions();
      res.json({ actions });
    } catch (error) {
      console.error("Get available actions error:", error);
      res.status(500).json({ error: "Failed to get available actions" });
    }
  });

  // GET /api/admin/activity/admins - Get list of admins with activity
  app.get("/api/admin/activity/admins", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const admins = await getActiveAdmins();
      res.json({ admins });
    } catch (error) {
      console.error("Get active admins error:", error);
      res.status(500).json({ error: "Failed to get active admins" });
    }
  });

  // GET /api/user/ai-usage - Get current user's AI usage for today
  app.get("/api/user/ai-usage", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [usage] = await db.select()
        .from(aiUsage)
        .where(and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.usageDate, today)
        ));

      // Get limits from settings
      const isPremium = user.plan === 'premium' || user.subscriptionStatus === 'active';
      const limitKey = isPremium ? 'ai.daily_limit_premium' : 'ai.daily_limit_free';
      const dailyLimit = await getSettingValue<number>(limitKey) ?? (isPremium ? 100 : 0);

      res.json({
        used: usage?.analysisCount ?? 0,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - (usage?.analysisCount ?? 0)),
        isPremium,
      });
    } catch (error) {
      console.error("Get AI usage error:", error);
      res.status(500).json({ error: "Failed to get AI usage" });
    }
  });

  // POST /api/user/accept-ai-disclaimer - Accept the AI analysis disclaimer
  app.post("/api/user/accept-ai-disclaimer", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;

      await db.update(users)
        .set({ aiDisclaimerAcceptedAt: new Date() })
        .where(eq(users.id, userId));

      res.json({ success: true, acceptedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Accept AI disclaimer error:", error);
      res.status(500).json({ error: "Failed to accept AI disclaimer" });
    }
  });

  // ============================================
  // SIGNATURE REQUEST ROUTES (Epic 4)
  // ============================================

  // Validation schemas
  const createSignatureRequestSchema = z.object({
    contractId: z.string().min(1, 'Contract ID is required'),
    signatories: z.array(z.object({
      name: z.string().min(1, 'Name is required').max(100),
      email: z.string().email('Invalid email'),
    })).min(1, 'At least one signatory required').max(10, 'Maximum 10 signatories'),
    message: z.string().max(1000).optional(),
    expiresAt: z.string().datetime().optional(),
  });

  const remindSignatorySchema = z.object({
    signatoryId: z.string().min(1, 'Signatory ID is required'),
  });

  // POST /api/signatures/request - Create signature request (all authenticated users)
  app.post("/api/signatures/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const input = createSignatureRequestSchema.parse(req.body);
      const userId = (req.session as any).userId;

      // Check for duplicate emails
      const emails = input.signatories.map(s => s.email.toLowerCase());
      if (new Set(emails).size !== emails.length) {
        return res.status(400).json({ error: 'Duplicate emails are not allowed' });
      }

      // Get contract
      const contract = await storage.getContract(input.contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Check ownership
      if (contract.userId !== userId) {
        return res.status(403).json({ error: 'You can only request signatures on your own contracts' });
      }

      // Check contract status
      if (contract.status === 'signed') {
        return res.status(400).json({ error: 'Contract is already signed' });
      }

      // Check for existing pending request
      const [existingRequest] = await db
        .select()
        .from(signatureRequests)
        .where(and(
          eq(signatureRequests.contractId, input.contractId),
          or(
            eq(signatureRequests.status, 'pending'),
            eq(signatureRequests.status, 'in_progress')
          )
        ));

      if (existingRequest) {
        return res.status(400).json({
          error: 'A signature request already exists for this contract',
          existingRequestId: existingRequest.id,
        });
      }

      // Generate PDF from contract with signature areas
      console.log(`[SIGNATURES] Generating PDF for contract ${input.contractId} with ${input.signatories.length} signature areas`);
      const pdfResult = await generateContractPDFWithSignatureAreas(contract, input.signatories.length);
      console.log(`[SIGNATURES] PDF generated: ${pdfResult.pageCount} pages, ${pdfResult.signaturePositions.length} signature positions`);

      // Upload to DocuSeal
      console.log(`[SIGNATURES] Uploading to DocuSeal`);
      let docusealService;
      try {
        docusealService = getDocuSealService();
      } catch (err) {
        console.error('[SIGNATURES] DocuSeal service not configured:', err);
        return res.status(503).json({
          error: 'E-signing service is not configured. Please contact support.',
          code: 'DOCUSEAL_NOT_CONFIGURED'
        });
      }
      const filename = `${contract.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const docusealDoc = await docusealService.uploadDocument(pdfResult.buffer, filename);

      // Calculate expiration
      const expiresAt = input.expiresAt
        ? new Date(input.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      // Create batch signature requests in DocuSeal with signature positions
      console.log(`[SIGNATURES] Creating batch request for ${input.signatories.length} signers with positions`);
      const batchResponse = await docusealService.createBatchSignatureRequests({
        documentId: docusealDoc.id,
        signers: input.signatories.map((s, i) => ({
          signerName: s.name,
          signerEmail: s.email.toLowerCase(),
          signingOrder: 1,
          // Pass signature position if available
          signaturePosition: pdfResult.signaturePositions[i] ? {
            page: pdfResult.signaturePositions[i].page,
            x: pdfResult.signaturePositions[i].x,
            y: pdfResult.signaturePositions[i].y,
            width: pdfResult.signaturePositions[i].width,
            height: pdfResult.signaturePositions[i].height,
          } : undefined,
        })),
        expiresAt: expiresAt.toISOString(),
        completedRedirectUrl: `${process.env.APP_URL}/dashboard?tab=contracts`,
      });

      // Create local signature request record
      const [signatureRequest] = await db
        .insert(signatureRequests)
        .values({
          contractId: input.contractId,
          initiatorId: userId,
          docusealDocumentId: docusealDoc.id,
          status: 'pending',
          signingOrder: 'parallel',
          message: input.message || null,
          expiresAt,
        })
        .returning();

      // Create signatory records
      console.log(`[SIGNATURES] DocuSeal batch response:`, JSON.stringify(batchResponse, null, 2));
      const signatoryRecords = await Promise.all(
        batchResponse.signatureRequests.map(async (sr, index) => {
          const signerInput = input.signatories[index];

          // Check if signer is a registered user
          const existingUser = await storage.getUserByEmail(signerInput.email.toLowerCase());

          const resolvedSigningUrl = sr.signingUrl || sr.signing_url || sr.embed_src || '';
          // Extract slug from signing URL as fallback token (e.g. /sign/sign_xxx → sign_xxx)
          const slugFromUrl = resolvedSigningUrl.split('/').pop() || '';
          const [signatory] = await db
            .insert(signatories)
            .values({
              signatureRequestId: signatureRequest.id,
              docusealRequestId: sr.id,
              signingToken: sr.signingToken || sr.slug || slugFromUrl || crypto.randomUUID(),
              signingUrl: resolvedSigningUrl,
              email: signerInput.email.toLowerCase(),
              name: signerInput.name,
              userId: existingUser?.id || null,
              signingOrder: 1,
              status: 'pending',
            })
            .returning();

          return signatory;
        })
      );

      // Update contract status
      await storage.updateContract(input.contractId, { status: 'pending_signature' } as any);

      // Epic 13: Update linked proposal status if this contract came from a proposal
      const linkedProposal = await db
        .select()
        .from(proposals)
        .where(eq(proposals.contractId, input.contractId))
        .limit(1);

      if (linkedProposal.length > 0) {
        await db
          .update(proposals)
          .set({
            status: 'pending_signature',
            updatedAt: new Date(),
          })
          .where(eq(proposals.id, linkedProposal[0].id));
        console.log(`[SIGNATURES] Updated linked proposal ${linkedProposal[0].id} status to pending_signature`);
      }

      // Get initiator info for email
      const initiator = await storage.getUser(userId);
      const initiatorName = initiator?.name || initiator?.email || 'Someone';

      // Send signature request emails to all signatories (parallel signing - all can sign immediately)
      console.log(`[SIGNATURES] Sending emails to pending signatories`);
      const baseUrl = getBaseUrl(req);
      for (const signatory of signatoryRecords) {
        console.log(`[SIGNATURES] Signatory record:`, JSON.stringify({ id: signatory.id, email: signatory.email, status: signatory.status, signingToken: signatory.signingToken, signingUrl: signatory.signingUrl }));
        if (signatory.status === 'pending' && signatory.signingUrl) {
          try {
            const contractDownloadUrl = signatory.signingToken
              ? `${baseUrl}/api/signatures/contract/${signatory.signingToken}`
              : null;
            console.log(`[SIGNATURES] contractDownloadUrl for ${signatory.email}:`, contractDownloadUrl);
            await sendSignatureRequestEmail(
              signatory.email,
              signatory.name,
              initiatorName,
              contract.name,
              signatory.signingUrl,
              input.message,
              contractDownloadUrl
            );
            console.log(`[SIGNATURES] Email sent to ${signatory.email}`);
          } catch (emailError) {
            // Log but don't fail the request - the signing URL is still valid
            console.error(`[SIGNATURES] Failed to send email to ${signatory.email}:`, emailError);
          }
        }
      }

      console.log(`[SIGNATURES] Request created: ${signatureRequest.id}`);

      res.json({
        signatureRequest: {
          ...signatureRequest,
          signatories: signatoryRecords,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }

      if (error instanceof DocuSealServiceError) {
        console.error('[SIGNATURES] DocuSeal error:', error.message);
        return res.status(502).json({ error: 'E-signing service temporarily unavailable' });
      }

      console.error('[SIGNATURES] Error creating request:', error);
      res.status(500).json({ error: 'Failed to create signature request' });
    }
  });

  // GET /api/signatures/request/:id - Get signature request
  app.get("/api/signatures/request/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const userEmail = (req.session as any).userEmail;

      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      // Get signatories
      const signatoriesList = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signatureRequestId, request.id))
        .orderBy(signatories.signingOrder);

      // Get contract
      const contract = await storage.getContract(request.contractId);

      // Check access: initiator or signatory
      const isInitiator = request.initiatorId === userId;
      const isSignatory = signatoriesList.some(
        s => s.userId === userId || s.email === userEmail
      );

      if (!isInitiator && !isSignatory) {
        return res.status(403).json({ error: 'Not authorized to view this request' });
      }

      // Hide signing URLs from non-initiators
      const filteredSignatories = isInitiator
        ? signatoriesList
        : signatoriesList.map(s => ({
            ...s,
            signingUrl: s.email === userEmail ? s.signingUrl : null,
            signingToken: null,
          }));

      res.json({
        signatureRequest: {
          ...request,
          signatories: filteredSignatories,
          contract: contract ? { id: contract.id, name: contract.name, type: contract.type } : null,
        },
      });
    } catch (error) {
      console.error('[SIGNATURES] Error fetching request:', error);
      res.status(500).json({ error: 'Failed to fetch signature request' });
    }
  });

  // GET /api/signatures/pending - List pending requests (as initiator)
  app.get("/api/signatures/pending", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;

      const requests = await db
        .select()
        .from(signatureRequests)
        .where(and(
          eq(signatureRequests.initiatorId, userId),
          or(
            eq(signatureRequests.status, 'pending'),
            eq(signatureRequests.status, 'in_progress')
          )
        ))
        .orderBy(desc(signatureRequests.createdAt));

      // Get signatories and contracts for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const signatoriesList = await db
            .select()
            .from(signatories)
            .where(eq(signatories.signatureRequestId, request.id))
            .orderBy(signatories.signingOrder);

          const contract = await storage.getContract(request.contractId);

          return {
            ...request,
            signatories: signatoriesList,
            contract: contract ? { id: contract.id, name: contract.name } : null,
          };
        })
      );

      res.json({ signatureRequests: requestsWithDetails });
    } catch (error) {
      console.error('[SIGNATURES] Error listing pending:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
  });

  // GET /api/signatures/to-sign - List requests to sign (as signatory)
  app.get("/api/signatures/to-sign", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Find signatories where user is the signer and status is pending
      const userSignatories = await db
        .select()
        .from(signatories)
        .where(and(
          or(
            eq(signatories.userId, userId),
            eq(signatories.email, user.email)
          ),
          eq(signatories.status, 'pending')
        ));

      // Get full details for each
      const toSign = await Promise.all(
        userSignatories.map(async (s) => {
          const [request] = await db
            .select()
            .from(signatureRequests)
            .where(eq(signatureRequests.id, s.signatureRequestId));

          if (!request || request.status === 'cancelled' || request.status === 'expired') {
            return null;
          }

          const contract = await storage.getContract(request.contractId);
          const initiator = await storage.getUser(request.initiatorId);

          return {
            id: request.id,
            contractId: request.contractId,
            contractTitle: contract?.name || 'Unknown Contract',
            initiator: initiator ? { id: initiator.id, name: initiator.name, email: initiator.email } : null,
            message: request.message,
            signingUrl: s.signingUrl,
            expiresAt: request.expiresAt,
            createdAt: request.createdAt,
          };
        })
      );

      res.json({ toSign: toSign.filter(Boolean) });
    } catch (error) {
      console.error('[SIGNATURES] Error listing to-sign:', error);
      res.status(500).json({ error: 'Failed to fetch requests to sign' });
    }
  });

  // DELETE /api/signatures/request/:id - Cancel signature request
  app.delete("/api/signatures/request/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;

      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      if (request.initiatorId !== userId) {
        return res.status(403).json({ error: 'Only the initiator can cancel a request' });
      }

      if (request.status === 'completed') {
        return res.status(400).json({ error: 'Cannot cancel a completed request' });
      }

      if (request.status === 'cancelled') {
        return res.status(400).json({ error: 'Request is already cancelled' });
      }

      // Get signatories and contract info for notifications
      const requestSignatories = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signatureRequestId, request.id));

      const contract = await storage.getContract(request.contractId);
      const initiator = await storage.getUser(userId);

      // Update status
      await db
        .update(signatureRequests)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(signatureRequests.id, req.params.id));

      // Update contract status back to draft
      await storage.updateContract(request.contractId, { status: 'draft' } as any);

      console.log(`[SIGNATURES] Request cancelled: ${request.id}`);

      // Send cancellation notifications to all signatories (fire and forget)
      for (const s of requestSignatories) {
        if (s.status !== 'signed') {
          sendSignatureCancelledEmail(
            s.email,
            s.name,
            contract?.name || 'Contract',
            initiator?.name || 'The initiator'
          ).catch((err: Error) => console.error('[SIGNATURES] Failed to send cancellation email:', err));
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[SIGNATURES] Error cancelling request:', error);
      res.status(500).json({ error: 'Failed to cancel request' });
    }
  });

  // POST /api/signatures/request/:id/remind - Send reminder
  app.post("/api/signatures/request/:id/remind", requireAuth, async (req: Request, res: Response) => {
    try {
      const input = remindSignatorySchema.parse(req.body);
      const userId = (req.session as any).userId;

      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, req.params.id));

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      if (request.initiatorId !== userId) {
        return res.status(403).json({ error: 'Only the initiator can send reminders' });
      }

      const [signatory] = await db
        .select()
        .from(signatories)
        .where(eq(signatories.id, input.signatoryId));

      if (!signatory || signatory.signatureRequestId !== request.id) {
        return res.status(404).json({ error: 'Signatory not found' });
      }

      if (signatory.status !== 'pending') {
        return res.status(400).json({
          error: signatory.status === 'signed'
            ? 'Signatory has already signed'
            : 'Signatory is not ready to sign yet',
        });
      }

      // Get contract and initiator info for email
      const contract = await storage.getContract(request.contractId);
      const initiator = await storage.getUser(request.initiatorId);
      const initiatorName = initiator?.name || initiator?.email || 'Someone';

      if (!signatory.signingUrl) {
        return res.status(400).json({ error: 'Signing URL not available' });
      }

      // Send reminder email
      const emailResult = await sendSignatureReminderEmail(
        signatory.email,
        signatory.name,
        initiatorName,
        contract?.name || 'Contract',
        signatory.signingUrl,
        request.message
      );

      if (!emailResult.success) {
        console.error(`[SIGNATURES] Failed to send reminder to ${signatory.email}:`, emailResult.error);
        return res.status(500).json({ error: 'Failed to send reminder email' });
      }

      console.log(`[SIGNATURES] Reminder sent to ${signatory.email} for request ${request.id}`);

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }

      console.error('[SIGNATURES] Error sending reminder:', error);
      res.status(500).json({ error: 'Failed to send reminder' });
    }
  });

  // GET /api/signatures - List all requests (history)
  app.get("/api/signatures", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { status, contractId } = req.query;

      // Build query with proper filtering
      let conditions = [eq(signatureRequests.initiatorId, userId)];

      // Add contractId filter if provided
      if (contractId && typeof contractId === 'string') {
        conditions.push(eq(signatureRequests.contractId, contractId));
      }

      const requests = await db
        .select()
        .from(signatureRequests)
        .where(and(...conditions))
        .orderBy(desc(signatureRequests.createdAt))
        .limit(50);

      // Filter by status if provided (client-side filter for backwards compatibility)
      const filteredRequests = status && typeof status === 'string'
        ? requests.filter(r => r.status === status)
        : requests;

      // Get signatories and contracts for each request
      const requestsWithDetails = await Promise.all(
        filteredRequests.map(async (request) => {
          const signatoriesList = await db
            .select()
            .from(signatories)
            .where(eq(signatories.signatureRequestId, request.id))
            .orderBy(signatories.signingOrder);

          const contract = await storage.getContract(request.contractId);

          return {
            ...request,
            signatories: signatoriesList,
            contract: contract ? { id: contract.id, name: contract.name } : null,
          };
        })
      );

      res.json({ signatureRequests: requestsWithDetails });
    } catch (error) {
      console.error('[SIGNATURES] Error listing requests:', error);
      res.status(500).json({ error: 'Failed to fetch signature requests' });
    }
  });

  // ============================================
  // WEBHOOK HANDLER (Story 4-5)
  // ============================================

  let WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.DOCUSEAL_WEBHOOK_SECRET || '';

  // Register webhook with DocuSeal on startup
  async function registerDocuSealWebhook() {
    try {
      const appUrl = process.env.APP_URL ||
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      const webhookUrl = `${appUrl}/api/webhooks/docuseal`;

      console.log(`[WEBHOOK] Registering webhook with DocuSeal at: ${webhookUrl}`);

      const docusealService = getDocuSealService();

      // First, list existing webhooks
      const existingWebhooks = await docusealService.listWebhooks();
      console.log(`[WEBHOOK] Found ${existingWebhooks.length} existing webhooks:`);
      existingWebhooks.forEach(w => console.log(`  - ${w.id}: ${w.url} (events: ${w.events?.join(', ') || 'all'})`));

      const existingWebhook = existingWebhooks.find(w => w.url === webhookUrl);

      // Delete any stale webhooks pointing to different URLs (e.g. old dev URLs)
      for (const w of existingWebhooks) {
        if (w.url !== webhookUrl) {
          console.log(`[WEBHOOK] Deleting stale webhook ${w.id} pointing to ${w.url}`);
          try {
            await docusealService.deleteWebhook(w.id);
          } catch (deleteErr) {
            console.warn(`[WEBHOOK] Failed to delete stale webhook ${w.id}:`, deleteErr);
          }
        }
      }

      if (existingWebhook) {
        console.log(`[WEBHOOK] Webhook already registered: ${existingWebhook.id}`);
        // Auto-sync secret from DocuSeal so env mismatch doesn't silently break webhooks
        if (existingWebhook.secret && !existingWebhook.secret.endsWith('...') && existingWebhook.secret !== WEBHOOK_SECRET) {
          console.log(`[WEBHOOK] Updating in-memory WEBHOOK_SECRET to match registered webhook`);
          WEBHOOK_SECRET = existingWebhook.secret;
        }
        return;
      }

      // Register new webhook for signature events
      const registration = await docusealService.registerWebhook({
        url: webhookUrl,
        events: [
          'signature.completed',
          'signature.next_signer_ready',
          'document.completed',
        ],
      });

      console.log(`[WEBHOOK] Successfully registered webhook: ${registration.id}`);
      if (registration.secret) {
        WEBHOOK_SECRET = registration.secret;
        console.log(`[WEBHOOK] Set in-memory WEBHOOK_SECRET from new registration`);
        console.log(`[WEBHOOK] IMPORTANT: Also set WEBHOOK_SECRET=${registration.secret} in your environment for persistence`);
      }
    } catch (error) {
      console.error('[WEBHOOK] Failed to register webhook with DocuSeal:', error);
      // Don't crash the server if webhook registration fails
    }
  }

  // Register webhook after a short delay to ensure server is ready
  setTimeout(() => {
    registerDocuSealWebhook();
  }, 5000);

  // Verify webhook signature
  function verifyWebhookSignature(payload: string, signature: string | undefined, secret: string): boolean {
    if (!signature || !secret) {
      // In development without secret, allow all webhooks
      if (!secret) {
        console.warn('[WEBHOOK] No webhook secret configured - skipping verification (dev mode)');
        return true;
      }
      console.warn(`[WEBHOOK] Missing signature or secret. Signature present: ${!!signature}, Secret present: ${!!secret}`);
      return false;
    }

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Log for debugging (remove in production)
    console.log(`[WEBHOOK] Signature verification:`);
    console.log(`  Received: ${signature}`);
    console.log(`  Expected: ${expectedSignature}`);
    console.log(`  Secret (first 10 chars): ${secret.substring(0, 10)}...`);

    // Handle both formats: "sha256=hash" or just "hash"
    const receivedHash = signature.startsWith('sha256=') ? signature.slice(7) : signature;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedHash),
        Buffer.from(expectedSignature)
      );
    } catch (e) {
      // Length mismatch
      console.error(`[WEBHOOK] Signature length mismatch: received ${receivedHash.length}, expected ${expectedSignature.length}`);
      return false;
    }
  }

  // POST /api/webhooks/docuseal - Handle DocuSeal webhook events
  app.post("/api/webhooks/docuseal", async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      const eventType = req.headers['x-webhook-event'] as string || req.body.event_type || req.body.event;
      const rawBody = JSON.stringify(req.body);

      console.log(`[WEBHOOK] Incoming request - event header: ${req.headers['x-webhook-event']}, body event_type: ${req.body.event_type}, body event: ${req.body.event}`);
      console.log(`[WEBHOOK] Body structure: ${JSON.stringify(Object.keys(req.body))}`);

      // Verify webhook signature
      if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
        console.error('[WEBHOOK] Invalid signature');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      console.log(`[WEBHOOK] Received event: ${eventType}`);

      const payload = req.body.data || req.body;
      console.log(`[WEBHOOK] Payload keys: ${JSON.stringify(Object.keys(payload))}`);
      console.log(`[WEBHOOK] Full payload: ${JSON.stringify(payload).substring(0, 500)}`);

      switch (eventType) {
        case 'signature.completed':
          await handleSignatureCompleted(payload);
          break;
        case 'signature.next_signer_ready':
          await handleNextSignerReady(payload, req);
          break;
        case 'document.completed':
          await handleDocumentCompleted(payload, req);
          break;
        default:
          console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('[WEBHOOK] Error processing webhook:', error);
      // Always return 200 to prevent retries
      res.json({ received: true, error: 'Processing error' });
    }
  });

  // GET /api/webhooks/docuseal/test - Check webhook registration status
  app.get("/api/webhooks/docuseal/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const docusealService = getDocuSealService();
      const webhooks = await docusealService.listWebhooks();
      const appUrl = process.env.APP_URL || '';
      const webhookUrl = `${appUrl}/api/webhooks/docuseal`;
      const match = webhooks.find((w: any) => w.url === webhookUrl);

      res.json({
        registered: !!match,
        webhookUrl,
        lastTriggered: match?.lastTriggeredAt || null,
        isActive: match?.isActive || false,
        secretConfigured: !!WEBHOOK_SECRET,
        totalWebhooks: webhooks.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check webhook status' });
    }
  });

  // POST /api/contracts/:id/sync-signature-status - Manually sync signature status from DocuSeal
  app.post("/api/contracts/:id/sync-signature-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const contractId = req.params.id;
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Find signature request for this contract
      const [sigReq] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.contractId, contractId));

      if (!sigReq) {
        return res.status(404).json({ error: 'No signature request found for this contract' });
      }

      // Query DocuSeal for current document status
      const docusealService = getDocuSealService();
      const docDetails = await docusealService.getDocument(sigReq.docusealDocumentId);

      console.log(`[SYNC] DocuSeal document ${sigReq.docusealDocumentId}:`, JSON.stringify(docDetails, null, 2));

      // Update local signatories based on DocuSeal status
      const localSignatories = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signatureRequestId, sigReq.id));

      let allSigned = true;
      const updates: any[] = [];

      for (const localSig of localSignatories) {
        // Match by email
        const remoteSig = docDetails.signatureRequests?.find(
          (r: any) => (r.signerEmail || r.signer_email || '').toLowerCase() === localSig.email.toLowerCase()
        );

        if (remoteSig) {
          const remoteStatus = remoteSig.status;
          if ((remoteStatus === 'signed' || remoteStatus === 'completed') && localSig.status !== 'signed') {
            await db
              .update(signatories)
              .set({ status: 'signed', signedAt: new Date(), updatedAt: new Date() })
              .where(eq(signatories.id, localSig.id));
            updates.push({ email: localSig.email, oldStatus: localSig.status, newStatus: 'signed' });
          }
          if (remoteStatus !== 'signed' && remoteStatus !== 'completed') {
            allSigned = false;
          }
        } else {
          allSigned = false;
        }
      }

      // If all signed, update signature request, download signed PDF, and update contract
      if (allSigned && localSignatories.length > 0) {
        // Download signed PDF if not already stored
        let signedPdfPath = sigReq.signedPdfPath;
        if (!signedPdfPath) {
          try {
            const pdfBuffer = await docusealService.downloadSignedDocument(sigReq.docusealDocumentId);
            if (pdfBuffer.slice(0, 5).toString().startsWith('%PDF')) {
              const filename = `signed_${Date.now()}.pdf`;
              const { uploadSignedPdf } = await import('./services/fileStorage');
              const uploadResult = await uploadSignedPdf(contractId, pdfBuffer, filename);
              signedPdfPath = uploadResult.path;
              console.log(`[SYNC] Downloaded signed PDF: ${signedPdfPath}`);
            }
          } catch (pdfErr) {
            console.error('[SYNC] Failed to download signed PDF:', pdfErr);
          }
        }

        if (sigReq.status !== 'completed') {
          await db
            .update(signatureRequests)
            .set({ status: 'completed', completedAt: new Date(), signedPdfPath, updatedAt: new Date() })
            .where(eq(signatureRequests.id, sigReq.id));
        }
        await storage.updateContract(contractId, { status: 'signed' } as any);
        console.log(`[SYNC] Contract ${contractId} marked as signed`);
      }

      const contract = await storage.getContract(contractId);
      res.json({
        contractStatus: contract?.status,
        signatureRequestStatus: allSigned ? 'completed' : sigReq.status,
        signatoryUpdates: updates,
        allSigned,
        docusealResponse: docDetails,
      });
    } catch (error) {
      console.error('[SYNC] Error syncing signature status:', error);
      res.status(500).json({ error: 'Failed to sync signature status' });
    }
  });

  // Handle individual signature completion
  async function handleSignatureCompleted(payload: any) {
    try {
      // Handle both possible field naming conventions from DocuSeal
      // signatureRequestId (documented) or signer_id (alternative)
      const signatureRequestId = payload.signatureRequestId || payload.signature_request_id || payload.signer_id;
      const signerEmail = payload.signerEmail || payload.signer_email;
      const submissionId = payload.submissionId || payload.submission_id || payload.documentId;

      console.log(`[WEBHOOK] Signature completed - payload keys: ${Object.keys(payload).join(', ')}`);
      console.log(`[WEBHOOK] Signature completed by ${signerEmail} for submission ${submissionId}, requestId: ${signatureRequestId}`);

      // Find the signatory by DocuSeal request ID first (exact match)
      let signatory: any = null;
      if (signatureRequestId) {
        const [match] = await db
          .select()
          .from(signatories)
          .where(eq(signatories.docusealRequestId, String(signatureRequestId)));
        signatory = match || null;
      }

      // Fall back to email, but scope to the specific submission's signature request
      if (!signatory && signerEmail && submissionId) {
        const [match] = await db
          .select({ signatory: signatories })
          .from(signatories)
          .innerJoin(signatureRequests, eq(signatories.signatureRequestId, signatureRequests.id))
          .where(
            and(
              eq(signatories.email, signerEmail.toLowerCase()),
              eq(signatureRequests.docusealDocumentId, String(submissionId))
            )
          );
        signatory = match?.signatory || null;
      }

      if (!signatory) {
        console.warn(`[WEBHOOK] Signatory not found for signatureRequestId: ${signatureRequestId}, email: ${signerEmail}`);
        console.warn(`[WEBHOOK] Full payload: ${JSON.stringify(payload)}`);
        return;
      }

      // Idempotency: skip if already signed
      if (signatory.status === 'signed') {
        console.log(`[WEBHOOK] Signatory ${signatory.id} already signed, skipping duplicate webhook`);
        return;
      }

      // Update signatory status to signed
      await db
        .update(signatories)
        .set({
          status: 'signed',
          signedAt: new Date(),
        })
        .where(eq(signatories.id, signatory.id));

      console.log(`[WEBHOOK] Updated signatory ${signatory.id} status to signed`);

      // Get request and contract for email
      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, signatory.signatureRequestId));

      if (request) {
        const contract = await storage.getContract(request.contractId);

        // Send confirmation email to the signatory
        sendSignatureConfirmationEmail(
          signatory.email,
          signatory.name,
          contract?.name || 'Contract'
        ).catch((err: Error) => console.error('[WEBHOOK] Failed to send confirmation email:', err));
      }
    } catch (error) {
      console.error('[WEBHOOK] Error handling signature.completed:', error);
    }
  }

  // Handle next signer ready notification
  async function handleNextSignerReady(payload: any, req: Request) {
    try {
      // Handle both possible field naming conventions from DocuSeal
      const signatureRequestId = payload.signatureRequestId || payload.signature_request_id || payload.signer_id;
      const signerEmail = payload.signerEmail || payload.signer_email;
      const signerName = payload.signerName || payload.signer_name;
      const signingUrl = payload.signingUrl || payload.signing_url;
      const submissionId = payload.submissionId || payload.submission_id || payload.documentId;

      console.log(`[WEBHOOK] Next signer ready - payload keys: ${Object.keys(payload).join(', ')}`);
      console.log(`[WEBHOOK] Next signer ready: ${signerEmail} for submission ${submissionId}, requestId: ${signatureRequestId}`);

      // Find the signatory by DocuSeal request ID first (exact match)
      let signatory: any = null;
      if (signatureRequestId) {
        const [match] = await db
          .select()
          .from(signatories)
          .where(eq(signatories.docusealRequestId, String(signatureRequestId)));
        signatory = match || null;
      }

      // Fall back to email, but scope to the specific submission's signature request
      if (!signatory && signerEmail && submissionId) {
        const [match] = await db
          .select({ signatory: signatories })
          .from(signatories)
          .innerJoin(signatureRequests, eq(signatories.signatureRequestId, signatureRequests.id))
          .where(
            and(
              eq(signatories.email, signerEmail.toLowerCase()),
              eq(signatureRequests.docusealDocumentId, String(submissionId))
            )
          );
        signatory = match?.signatory || null;
      }

      if (!signatory) {
        console.warn(`[WEBHOOK] Signatory not found for next signer: ${signerEmail}, requestId: ${signatureRequestId}`);
        console.warn(`[WEBHOOK] Full payload: ${JSON.stringify(payload)}`);
        return;
      }

      // Update signatory status to pending and set signing URL
      await db
        .update(signatories)
        .set({
          status: 'pending',
          signingUrl: signingUrl || signatory.signingUrl,
        })
        .where(eq(signatories.id, signatory.id));

      console.log(`[WEBHOOK] Updated signatory ${signatory.id} status to pending`);

      // Get request and contract info for email
      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, signatory.signatureRequestId));

      if (request) {
        const contract = await storage.getContract(request.contractId);
        const initiator = await storage.getUser(request.initiatorId);
        const baseUrl = getBaseUrl(req);

        // Backfill signingToken if missing (for signatories created before the fix)
        let token = signatory.signingToken;
        if (!token) {
          token = crypto.randomUUID();
          await db
            .update(signatories)
            .set({ signingToken: token })
            .where(eq(signatories.id, signatory.id));
          console.log(`[WEBHOOK] Backfilled signingToken for signatory ${signatory.id}`);
        }

        const contractDownloadUrl = `${baseUrl}/api/signatures/contract/${token}`;

        // Send signature request email
        sendSignatureRequestEmail(
          signatory.email,
          signatory.name,
          initiator?.name || 'Someone',
          contract?.name || 'Contract',
          signingUrl || signatory.signingUrl || '',
          request.message,
          contractDownloadUrl
        ).catch((err: Error) => console.error('[WEBHOOK] Failed to send request email:', err));
      }
    } catch (error) {
      console.error('[WEBHOOK] Error handling signature.next_signer_ready:', error);
    }
  }

  // Handle document completion (all signatures done)
  async function handleDocumentCompleted(payload: any, req: Request) {
    try {
      // Handle both possible field naming conventions from DocuSeal
      const documentId = payload.documentId || payload.document_id;
      const submissionId = payload.submissionId || payload.submission_id;

      // Check multiple possible field names for signed PDF content
      const signedContent = payload.signedContent || payload.signed_content ||
                           payload.signedPdf || payload.signed_pdf ||
                           payload.result || payload.pdfContent || payload.pdf_content;

      // Check for direct URL to signed PDF
      const signedPdfUrl = payload.resultUrl || payload.result_url ||
                          payload.downloadUrl || payload.download_url ||
                          payload.signedPdfUrl || payload.signed_pdf_url ||
                          payload.pdfUrl || payload.pdf_url;

      console.log(`[WEBHOOK] Document completed - payload keys: ${Object.keys(payload).join(', ')}`);
      console.log(`[WEBHOOK] Document completed: ${documentId} (type: ${typeof documentId}), submissionId: ${submissionId}`);
      console.log(`[WEBHOOK] Looking up by docusealDocumentId: "${String(documentId)}"`);
      console.log(`[WEBHOOK] Has signedContent: ${!!signedContent}, Has signedPdfUrl: ${!!signedPdfUrl}`);

      // Find the signature request by DocuSeal document ID
      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.docusealDocumentId, String(documentId)));

      if (!request) {
        console.warn(`[WEBHOOK] Signature request not found for document: ${documentId}`);
        console.warn(`[WEBHOOK] Full payload: ${JSON.stringify(payload)}`);
        return;
      }

      // Idempotency: skip if already completed
      if (request.status === 'completed') {
        console.log(`[WEBHOOK] Signature request ${request.id} already completed, skipping duplicate webhook`);
        return;
      }

      // Get signed PDF - either from webhook payload or by downloading from DocuSeal
      let signedPdfPath: string | null = null;

      try {
        let signedPdfBuffer: Buffer;

        if (signedContent) {
          // Use base64-encoded PDF from webhook payload
          console.log(`[WEBHOOK] Using signedContent from webhook payload`);
          signedPdfBuffer = Buffer.from(signedContent, 'base64');
        } else if (signedPdfUrl) {
          // Download from the URL provided in the webhook
          console.log(`[WEBHOOK] Downloading signed PDF from URL: ${signedPdfUrl}`);
          const response = await fetch(signedPdfUrl);
          if (!response.ok) {
            throw new Error(`Failed to download from URL: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          signedPdfBuffer = Buffer.from(arrayBuffer);
        } else {
          // Download from DocuSeal API
          console.log(`[WEBHOOK] Downloading signed PDF from DocuSeal API`);
          const docusealService = getDocuSealService();
          signedPdfBuffer = await docusealService.downloadSignedDocument(String(documentId));
        }

        console.log(`[WEBHOOK] Signed PDF buffer size: ${signedPdfBuffer.length} bytes`);

        // Verify it looks like a PDF
        const pdfHeader = signedPdfBuffer.slice(0, 5).toString();
        if (!pdfHeader.startsWith('%PDF')) {
          console.error(`[WEBHOOK] Downloaded content is not a valid PDF. Header: ${pdfHeader}`);
          console.error(`[WEBHOOK] First 100 bytes: ${signedPdfBuffer.slice(0, 100).toString()}`);
        }

        // Upload to storage
        const contract = await storage.getContract(request.contractId);
        const filename = `signed_${Date.now()}.pdf`;

        const uploadResult = await uploadSignedPdf(request.contractId, signedPdfBuffer, filename);
        signedPdfPath = uploadResult.path;

        console.log(`[WEBHOOK] Signed PDF stored at: ${signedPdfPath}`);
      } catch (downloadError) {
        const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError);
        console.error('[WEBHOOK] Failed to download/store signed PDF:', errorMessage);
        console.error('[WEBHOOK] Full error:', downloadError);
        // Log full payload to help debug what fields are available
        console.error('[WEBHOOK] Full payload for debugging:', JSON.stringify(payload, null, 2));
      }

      // Update signature request status (completed even if PDF download failed)
      // The signedPdfPath will be null if download failed, which the UI should handle
      await db
        .update(signatureRequests)
        .set({
          status: 'completed',
          completedAt: new Date(),
          signedPdfPath,
          updatedAt: new Date(),
        })
        .where(eq(signatureRequests.id, request.id));

      // Update contract status to signed
      await storage.updateContract(request.contractId, { status: 'signed' } as any);
      const verifiedContract = await storage.getContract(request.contractId);
      console.log(`[WEBHOOK] Updated contract ${request.contractId} to 'signed', verified status: ${verifiedContract?.status}`);

      // Epic 13: Update linked proposal status to responded (completed)
      const linkedProposal = await db
        .select()
        .from(proposals)
        .where(eq(proposals.contractId, request.contractId))
        .limit(1);

      if (linkedProposal.length > 0) {
        await db
          .update(proposals)
          .set({
            status: 'responded',
            respondedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(proposals.id, linkedProposal[0].id));
        console.log(`[WEBHOOK] Updated linked proposal ${linkedProposal[0].id} status to responded (signed)`);
      }

      console.log(`[WEBHOOK] Request ${request.id} marked as completed`);

      // Get all signatories and send completion emails
      const requestSignatories = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signatureRequestId, request.id));

      const contract = await storage.getContract(request.contractId);
      const initiator = await storage.getUser(request.initiatorId);
      const downloadUrl = signedPdfPath
        ? `${getBaseUrl(req)}/api/contracts/${request.contractId}/signed-pdf`
        : '';

      // Send to initiator
      if (initiator) {
        sendDocumentCompletedEmail(
          initiator.email,
          initiator.name,
          contract?.name || 'Contract',
          downloadUrl
        ).catch((err: Error) => console.error('[WEBHOOK] Failed to send completion email to initiator:', err));
      }

      // Send to all signatories
      for (const s of requestSignatories) {
        sendDocumentCompletedEmail(
          s.email,
          s.name,
          contract?.name || 'Contract',
          downloadUrl
        ).catch((err: Error) => console.error('[WEBHOOK] Failed to send completion email to signatory:', err));
      }
    } catch (error) {
      console.error('[WEBHOOK] Error handling document.completed:', error);
    }
  }

  // GET /api/contracts/:id/signed-pdf - Download signed PDF
  app.get("/api/contracts/:id/signed-pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const contractId = req.params.id;

      // Get the contract
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Check if user has access (owner or signatory)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get signature request for this contract
      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.contractId, contractId));

      if (!request || request.status !== 'completed' || !request.signedPdfPath) {
        return res.status(404).json({ error: 'Signed document not available' });
      }

      // Check authorization (initiator or signatory)
      const isInitiator = request.initiatorId === userId;
      const [isSignatory] = await db
        .select()
        .from(signatories)
        .where(and(
          eq(signatories.signatureRequestId, request.id),
          or(
            eq(signatories.userId, userId),
            eq(signatories.email, user.email)
          )
        ));

      if (!isInitiator && !isSignatory) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Download and serve the signed PDF
      try {
        const pdfBuffer = await downloadContractFile(request.signedPdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="signed_${contract.name || 'contract'}.pdf"`);
        return res.send(pdfBuffer);
      } catch {
        return res.status(404).json({ error: 'Signed document not found' });
      }
    } catch (error) {
      console.error('[SIGNATURES] Error downloading signed PDF:', error);
      res.status(500).json({ error: 'Failed to download signed document' });
    }
  });

  // GET /api/signatures/contract/:token - Download contract for signatory (public, token-based auth)
  app.get("/api/signatures/contract/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Find signatory by signing token
      const [signatory] = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signingToken, token));

      if (!signatory) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }

      // Get the signature request to find the contract
      const [request] = await db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.id, signatory.signatureRequestId));

      if (!request) {
        return res.status(404).json({ error: 'Signature request not found' });
      }

      // Get the contract
      const contract = await storage.getContract(request.contractId);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // For uploaded contracts, return the file
      if (contract.filePath) {
        const buffer = await downloadContractFile(contract.filePath);
        res.setHeader("Content-Type", getContentType(contract.fileType || "pdf"));
        res.setHeader("Content-Disposition", `inline; filename="${contract.fileName || 'contract.pdf'}"`);
        return res.send(buffer);
      }

      // For template contracts, generate PDF from rendered content
      if (contract.renderedContent || contract.extractedText) {
        const pdfResult = await generateContractPDFWithSignatureAreas(
          { name: contract.name, renderedContent: contract.renderedContent, extractedText: contract.extractedText },
          0
        );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${contract.name || 'contract'}.pdf"`);
        return res.send(pdfResult.buffer);
      }

      return res.status(404).json({ error: 'No contract document available' });
    } catch (error) {
      console.error('[SIGNATURES] Error downloading contract for signatory:', error);
      res.status(500).json({ error: 'Failed to download contract' });
    }
  });

  // ============================================
  // PROPOSAL ROUTES (Epic 7)
  // ============================================

  // GET /api/proposals/unread-count - Get count of new proposals for current user
  app.get("/api/proposals/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [result] = await db
        .select({ count: count() })
        .from(proposals)
        .where(
          and(
            eq(proposals.userId, userId),
            eq(proposals.status, 'new')
          )
        );

      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error('[PROPOSALS] Unread count error:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  // Zod schema for proposal submission
  const proposalSubmissionSchema = z.object({
    landingPageId: z.string().min(1, 'Landing page ID is required'),
    senderName: z.string().min(1, 'Name is required').max(255),
    senderEmail: z.string().email('Invalid email format').max(255),
    senderCompany: z.string().max(255).optional().nullable(),
    proposalType: z.enum(PROPOSAL_TYPES),
    message: z.string().min(1, 'Message is required').max(1000, 'Message must be 1000 characters or less'),
  });

  // POST /api/proposals - Submit new proposal with optional contract (Epic 13)
  // Supports both JSON body (no file) and multipart/form-data (with file)
  app.post("/api/proposals", proposalRateLimiter, proposalContractUpload.single('contractFile'), async (req: Request, res: Response) => {
    try {
      // Handle both JSON and multipart/form-data
      let proposalData;
      if (req.body.proposalData) {
        // Multipart form: proposal data is in a JSON string field
        try {
          proposalData = JSON.parse(req.body.proposalData);
        } catch {
          return res.status(400).json({ error: 'Invalid proposal data format' });
        }
      } else {
        // Regular JSON body
        proposalData = req.body;
      }

      const parsed = proposalSubmissionSchema.safeParse(proposalData);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { landingPageId, senderName, senderEmail, senderCompany, proposalType, message } = parsed.data;

      // Find landing page
      const landingPage = await storage.getLandingPage(landingPageId);

      if (!landingPage) {
        return res.status(404).json({ error: 'Landing page not found' });
      }

      if (!landingPage.isPublished) {
        return res.status(400).json({ error: 'This page is not accepting proposals' });
      }

      // Create proposal first to get the ID
      const [proposal] = await db
        .insert(proposals)
        .values({
          landingPageId,
          userId: landingPage.userId,
          senderName,
          senderEmail,
          senderCompany: senderCompany || null,
          proposalType,
          message,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          hasContract: false, // Will update if file is present
        })
        .returning();

      // Handle contract file upload (Epic 13)
      let contractFileName: string | null = null;
      let contractFilePath: string | null = null;
      let contractFileSize: number | null = null;
      let contractFileType: string | null = null;

      if (req.file) {
        try {
          // Verify file type using magic bytes
          const verification = await verifyFileType(req.file.buffer);
          if (!verification.valid) {
            // Delete the proposal and return error
            await db.delete(proposals).where(eq(proposals.id, proposal.id));
            return res.status(400).json({ error: verification.error || 'Invalid file type' });
          }

          // Upload to Object Storage
          const uploaded = await uploadProposalContract(
            proposal.id,
            req.file.buffer,
            req.file.originalname
          );

          contractFileName = req.file.originalname;
          contractFilePath = uploaded.path;
          contractFileSize = uploaded.size;
          contractFileType = verification.type;

          // Update proposal with file info
          await db
            .update(proposals)
            .set({
              hasContract: true,
              contractFileName,
              contractFilePath,
              contractFileSize,
              contractFileType,
              updatedAt: new Date(),
            })
            .where(eq(proposals.id, proposal.id));

          console.log(`[PROPOSALS] Contract uploaded: ${contractFileName} (${contractFileSize} bytes) for proposal ${proposal.id}`);
        } catch (uploadError) {
          console.error('[PROPOSALS] Contract upload failed:', uploadError);
          // Continue without the contract - don't fail the whole proposal
        }
      }

      console.log(`[PROPOSALS] New proposal submitted: ${proposal.id} for landing page ${landingPageId}${contractFileName ? ' (with contract)' : ''}`);

      // Send notification email to artist (Story 7.4, enhanced for Epic 13)
      const artist = await storage.getUser(landingPage.userId);
      if (artist) {
        sendProposalNotificationEmail({
          artistEmail: artist.email,
          artistName: artist.name,
          landingPageTitle: landingPage.artistName,
          senderName,
          senderEmail,
          senderCompany,
          proposalType,
          message,
          proposalId: proposal.id,
          baseUrl: getBaseUrl(req),
          // Epic 13: Include contract info
          hasContract: !!contractFileName,
          contractFileName: contractFileName || undefined,
        }).catch((err) => {
          // Log but don't fail the request if email fails
          console.error('[PROPOSALS] Failed to send notification email:', err);
        });
      }

      res.status(201).json({
        success: true,
        message: contractFileName
          ? 'Proposal with contract submitted successfully'
          : 'Proposal submitted successfully',
        hasContract: !!contractFileName,
      });
    } catch (error) {
      console.error('[PROPOSALS] Submit error:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Contract file too large. Maximum size: 10MB' });
        }
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to submit proposal' });
    }
  });

  // GET /api/proposals - List user's proposals (authenticated)
  app.get("/api/proposals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const status = req.query.status as string | undefined;
      const hasContractFilter = req.query.hasContract as string | undefined;

      // Build where conditions
      const conditions = [eq(proposals.userId, userId)];

      if (status && status !== 'all') {
        conditions.push(eq(proposals.status, status));
      }

      // Epic 13: Filter by hasContract
      if (hasContractFilter === 'true') {
        conditions.push(eq(proposals.hasContract, true));
      } else if (hasContractFilter === 'false') {
        conditions.push(eq(proposals.hasContract, false));
      }

      const whereConditions = conditions.length === 1 ? conditions[0] : and(...conditions);

      const results = await db
        .select({
          id: proposals.id,
          senderName: proposals.senderName,
          senderEmail: proposals.senderEmail,
          senderCompany: proposals.senderCompany,
          proposalType: proposals.proposalType,
          message: proposals.message,
          status: proposals.status,
          createdAt: proposals.createdAt,
          viewedAt: proposals.viewedAt,
          respondedAt: proposals.respondedAt,
          landingPageId: proposals.landingPageId,
          // Epic 13: Include contract fields
          hasContract: proposals.hasContract,
          contractFileName: proposals.contractFileName,
        })
        .from(proposals)
        .where(whereConditions)
        .orderBy(desc(proposals.createdAt));

      // Get landing page info for each proposal
      const proposalsWithLandingPage = await Promise.all(
        results.map(async (proposal) => {
          const landingPage = await storage.getLandingPage(proposal.landingPageId);
          return {
            ...proposal,
            landingPage: landingPage ? {
              id: landingPage.id,
              artistName: landingPage.artistName,
            } : null,
          };
        })
      );

      res.json({ proposals: proposalsWithLandingPage });
    } catch (error) {
      console.error('[PROPOSALS] List error:', error);
      res.status(500).json({ error: 'Failed to fetch proposals' });
    }
  });

  // GET /api/proposals/:id - Get proposal detail (authenticated)
  app.get("/api/proposals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;

      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      // Mark as viewed if new
      if (proposal.status === 'new') {
        await db
          .update(proposals)
          .set({ status: 'viewed', viewedAt: new Date(), updatedAt: new Date() })
          .where(eq(proposals.id, id));
      }

      // Get landing page info
      const landingPage = await storage.getLandingPage(proposal.landingPageId);

      res.json({
        ...proposal,
        status: proposal.status === 'new' ? 'viewed' : proposal.status,
        viewedAt: proposal.status === 'new' ? new Date() : proposal.viewedAt,
        landingPage: landingPage ? {
          id: landingPage.id,
          artistName: landingPage.artistName,
        } : null,
      });
    } catch (error) {
      console.error('[PROPOSALS] Get error:', error);
      res.status(500).json({ error: 'Failed to fetch proposal' });
    }
  });

  // PATCH /api/proposals/:id - Update proposal status (authenticated)
  app.patch("/api/proposals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Validate status (Epic 13: added in_review and pending_signature)
      const validStatuses = ['new', 'viewed', 'in_review', 'pending_signature', 'responded', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Check proposal exists and belongs to user
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      // Build update data
      const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === 'viewed' && !proposal.viewedAt) {
        updateData.viewedAt = new Date();
      }
      if (status === 'responded' && !proposal.respondedAt) {
        updateData.respondedAt = new Date();
      }

      await db
        .update(proposals)
        .set(updateData)
        .where(eq(proposals.id, id));

      console.log(`[PROPOSALS] Status updated: ${id} -> ${status}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[PROPOSALS] Update error:', error);
      res.status(500).json({ error: 'Failed to update proposal' });
    }
  });

  // DELETE /api/proposals/:id - Delete proposal (authenticated)
  app.delete("/api/proposals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;

      // Check proposal exists and belongs to user
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      await db.delete(proposals).where(eq(proposals.id, id));

      console.log(`[PROPOSALS] Deleted: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[PROPOSALS] Delete error:', error);
      res.status(500).json({ error: 'Failed to delete proposal' });
    }
  });

  // POST /api/proposals/:id/contract - Create contract from proposal (Story 7.6)
  app.post("/api/proposals/:id/contract", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { templateId } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      // Verify proposal exists and belongs to user
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      // Check if contract already exists for this proposal
      if (proposal.contractId) {
        return res.status(400).json({
          error: 'Contract already created from this proposal',
          contractId: proposal.contractId
        });
      }

      // Get template
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Create contract with pre-filled data from proposal
      const contractName = `${template.name} - ${proposal.senderName}`;

      const contract = await storage.createContract({
        userId,
        name: contractName,
        type: template.category || 'other',
        status: 'draft',
        templateId,
        partnerName: proposal.senderName,
        // Store sender info in templateData for form pre-fill
        templateData: {
          fields: {
            counterpartyName: proposal.senderName,
            counterpartyEmail: proposal.senderEmail,
            ...(proposal.senderCompany ? { counterpartyCompany: proposal.senderCompany } : {}),
          },
          enabledClauses: [],
        },
      });

      // Update proposal with contract link and status
      await db
        .update(proposals)
        .set({
          contractId: contract.id,
          status: 'responded',
          respondedAt: proposal.respondedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, id));

      console.log(`[PROPOSALS] Created contract ${contract.id} from proposal ${id}`);
      res.status(201).json({
        success: true,
        contractId: contract.id,
      });
    } catch (error) {
      console.error('[PROPOSALS] Create contract error:', error);
      res.status(500).json({ error: 'Failed to create contract from proposal' });
    }
  });

  // ============================================
  // EPIC 13: PDF CONTRACT CONVERSION ENDPOINTS
  // ============================================

  // GET /api/proposals/:id/contract-file - Download/stream contract file for preview
  app.get("/api/proposals/:id/contract-file", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;

      // Verify proposal exists and belongs to user
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      if (!proposal.hasContract || !proposal.contractFilePath) {
        return res.status(404).json({ error: 'No contract attached to this proposal' });
      }

      // Download file from storage
      const fileBuffer = await downloadProposalContract(proposal.contractFilePath);

      // Set appropriate headers
      const contentType = getContentType(proposal.contractFileType || 'pdf');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${proposal.contractFileName || 'contract.pdf'}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      res.send(fileBuffer);
    } catch (error) {
      console.error('[PROPOSALS] Contract file download error:', error);
      res.status(500).json({ error: 'Failed to download contract file' });
    }
  });

  // POST /api/proposals/:id/convert-contract - Convert uploaded PDF to editable contract (Epic 13)
  // Redesigned: Now uses AI to parse fields and returns structured data for form review
  app.post("/api/proposals/:id/convert-contract", requireAuth, requirePremium, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;

      // Verify proposal exists and belongs to user
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, id), eq(proposals.userId, userId)));

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      if (!proposal.hasContract || !proposal.contractFilePath) {
        return res.status(400).json({ error: 'No contract attached to this proposal' });
      }

      // Check if already converted
      if (proposal.contractId) {
        return res.status(400).json({
          error: 'Contract already converted',
          contractId: proposal.contractId
        });
      }

      // Download file from storage
      const fileBuffer = await downloadProposalContract(proposal.contractFilePath);

      // Extract text from document
      const extraction = await extractText(fileBuffer, proposal.contractFileType || 'pdf');

      console.log(`[PROPOSALS] Extracted ${extraction.charCount} chars from proposal ${id} contract`);

      // Use AI to parse contract fields (NEW: intelligent parsing)
      let parsedFields: ParsedContractFields | null = null;
      if (extraction.text && extraction.charCount > 100) {
        try {
          const truncated = truncateForAI(extraction.text, 30000); // 30k chars max for speed
          parsedFields = await parseContractFields(truncated.text);
          console.log(`[PROPOSALS] AI extracted fields with ${parsedFields.confidence}% confidence`);
          console.log(`[PROPOSALS] Parsed fields summary:`, JSON.stringify({
            contractType: parsedFields.contractType,
            title: parsedFields.title,
            partiesCount: parsedFields.parties?.length,
            termsCount: parsedFields.termsAndConditions?.length,
            hasFillableFields: !!parsedFields.fillableFields?.length,
            hasFinancialTerms: !!parsedFields.financialTerms?.fees?.length,
          }));
        } catch (aiError) {
          console.error('[PROPOSALS] AI field extraction failed, continuing without:', aiError);
          // Continue without AI extraction - user can fill in manually
        }
      } else {
        console.log(`[PROPOSALS] Skipping AI extraction - text too short (${extraction.charCount} chars)`);
      }

      // Map proposal type to contract type
      const contractTypeMap: Record<string, string> = {
        collaboration: 'artist',
        licensing: 'licensing',
        booking: 'touring',
        recording: 'production',
        distribution: 'business',
        other: 'other'
      };

      // Determine contract type - prefer AI-detected type
      const contractType = parsedFields?.contractType
        ? mapParsedTypeToContractType(parsedFields.contractType)
        : (contractTypeMap[proposal.proposalType] || 'other');

      // Create contract record with parsed fields
      const contractName = parsedFields?.title ||
        (proposal.contractFileName ? proposal.contractFileName.replace(/\.[^/.]+$/, '') : `Contract from ${proposal.senderName}`);

      const contract = await storage.createContract({
        userId,
        name: contractName,
        type: contractType,
        status: 'pending_review', // NEW: Status indicates fields need review before generating
        partnerName: proposal.senderName,
        fileName: proposal.contractFileName,
        filePath: proposal.contractFilePath,
        fileSize: proposal.contractFileSize,
        fileType: proposal.contractFileType,
        extractedText: extraction.text || '',
        // Store parsed fields in templateData for form editing
        templateData: parsedFields as any,
        // Don't generate renderedContent yet - user reviews fields first
        renderedContent: null,
      });

      // Link contract to proposal and update status
      await db
        .update(proposals)
        .set({
          contractId: contract.id,
          status: 'in_review',
          contractExtractedText: extraction.text || '',
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, id));

      console.log(`[PROPOSALS] Converted proposal ${id} to contract ${contract.id} (pending field review)`);
      console.log(`[PROPOSALS] Contract templateData saved:`, contract.templateData ? 'yes' : 'no', typeof contract.templateData);

      res.status(201).json({
        success: true,
        contractId: contract.id,
        extraction: {
          success: extraction.success,
          charCount: extraction.charCount,
        },
        parsedFields: parsedFields, // Include parsed fields in response
      });
    } catch (error) {
      console.error('[PROPOSALS] Convert contract error:', error);
      res.status(500).json({ error: 'Failed to convert contract' });
    }
  });

  // POST /api/contracts/:id/generate - Generate Aermuse-styled contract from field data
  app.post("/api/contracts/:id/generate", requireAuth, requirePremium, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { fields } = req.body; // Updated field data from the form

      // Fetch contract
      const contract = await storage.getContract(id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Validate the contract is in the right state
      if (contract.status !== 'pending_review' && contract.status !== 'pending') {
        return res.status(400).json({
          error: 'Contract is not in a state that allows generation',
          currentStatus: contract.status
        });
      }

      // Merge existing templateData with user updates
      const existingData = (contract.templateData as unknown as ParsedContractFields) || {};
      const mergedFields: ParsedContractFields = {
        ...existingData,
        ...fields,
        // Ensure required fields
        contractType: fields.contractType || existingData.contractType || 'other',
        title: fields.title || existingData.title || contract.name,
        parties: fields.parties || existingData.parties || [],
        projectDetails: fields.projectDetails || existingData.projectDetails || {},
        dates: fields.dates || existingData.dates || {},
        financialTerms: fields.financialTerms || existingData.financialTerms || {},
        confidence: existingData.confidence || 100, // User-reviewed, so confidence is high
      };

      // Generate the Aermuse-styled HTML contract
      const renderedContent = generateAermuseContract(mergedFields);

      // Update contract with generated content
      await storage.updateContract(id, {
        templateData: mergedFields as any,
        renderedContent,
        status: 'pending', // Ready for signatures
        name: mergedFields.title || contract.name,
        type: mapParsedTypeToContractType(mergedFields.contractType),
      });

      console.log(`[CONTRACTS] Generated Aermuse contract for ${id}`);

      // Trigger async AI analysis for risk assessment
      if (contract.extractedText) {
        analyzeContractAsync(id, contract.extractedText, mergedFields.contractType);
      }

      res.json({
        success: true,
        contractId: id,
        renderedContent,
      });
    } catch (error) {
      console.error('[CONTRACTS] Generate contract error:', error);
      res.status(500).json({ error: 'Failed to generate contract' });
    }
  });

  // POST /api/contracts/:id/reparse - Re-parse contract extracted text with AI
  // Used when existing contracts need field extraction or re-extraction
  app.post("/api/contracts/:id/reparse", requireAuth, requirePremium, async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`[CONTRACTS] Reparse request for contract ${id}`);

    try {
      const userId = req.session?.userId;
      if (!userId) {
        console.log(`[CONTRACTS] Reparse failed: not authenticated`);
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Fetch contract
      const contract = await storage.getContract(id);
      if (!contract || contract.userId !== userId) {
        console.log(`[CONTRACTS] Reparse failed: contract not found or not owned`);
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Need extracted text to parse
      if (!contract.extractedText || contract.extractedText.length < 100) {
        console.log(`[CONTRACTS] Reparse failed: no extracted text (${contract.extractedText?.length || 0} chars)`);
        return res.status(400).json({
          error: 'No extracted text available. Please upload a contract file first.',
        });
      }

      // Parse fields with AI - use smaller limit for faster extraction
      console.log(`[CONTRACTS] Re-parsing contract ${id} extracted text (${contract.extractedText.length} chars)`);
      const truncated = truncateForAI(contract.extractedText, 30000); // 30k chars max for speed
      console.log(`[CONTRACTS] Truncated text: ${truncated.text.length} chars, truncated: ${truncated.truncated}`);

      const parsedFields = await parseContractFields(truncated.text);

      console.log(`[CONTRACTS] Re-parsed fields with ${parsedFields.confidence}% confidence`);
      console.log(`[CONTRACTS] Parsed fields summary:`, JSON.stringify({
        contractType: parsedFields.contractType,
        title: parsedFields.title,
        partiesCount: parsedFields.parties?.length,
        termsCount: parsedFields.termsAndConditions?.length,
        hasFillableFields: !!parsedFields.fillableFields?.length,
        hasFinancialTerms: !!parsedFields.financialTerms?.fees?.length,
      }));

      // Update contract with new templateData
      await storage.updateContract(id, {
        templateData: parsedFields as any,
        status: 'pending_review', // Reset to field review state
        renderedContent: null, // Clear any existing rendered content
      });

      console.log(`[CONTRACTS] Reparse complete for contract ${id}`);

      res.json({
        success: true,
        contractId: id,
        parsedFields,
      });
    } catch (error: any) {
      console.error('[CONTRACTS] Re-parse error:', error?.message || error);
      console.error('[CONTRACTS] Re-parse error stack:', error?.stack);

      if (error instanceof OpenAIError) {
        return res.status(503).json({ error: error.message, code: error.code });
      }

      // Ensure we always send a JSON response
      res.status(500).json({
        error: error?.message || 'Failed to re-parse contract',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  });

  // ============================================
  // MERCH PRODUCT CRUD (Theta tier gated)
  // ============================================

  // Get all products for the authenticated artist
  // Upload a merch product image
  app.post("/api/merch/products/:id/images", requireAuth, requireFeature('merch-selling'), imageUpload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const result = await uploadMerchImage(userId, product.id, file.buffer, extension);
      const url = `/api/merch/images/${encodeURIComponent(result.path)}`;

      // Add URL to the product's images array
      const currentImages = (product.images as string[]) || [];
      currentImages.push(url);
      await storage.updateProduct(product.id, { images: currentImages });

      res.json({ success: true, url, path: result.path });
    } catch (error) {
      console.error("Merch image upload error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 15MB." });
        }
      }
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Serve a merch product image
  app.get("/api/merch/images/:path(*)", async (req: Request, res: Response) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const extension = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const buffer = await downloadMerchImage(filePath);

      res.set('Content-Type', getImageContentType(extension));
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (error) {
      console.error("Merch image download error:", error);
      res.status(404).json({ error: "Image not found" });
    }
  });

  // Delete a merch product image
  app.delete("/api/merch/products/:id/images", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Image URL required" });
      }

      // Remove from product's images array
      const currentImages = (product.images as string[]) || [];
      const updatedImages = currentImages.filter((img: string) => img !== url);
      await storage.updateProduct(product.id, { images: updatedImages });

      // Delete from object storage
      const pathMatch = url.match(/\/api\/merch\/images\/(.+)/);
      if (pathMatch) {
        await deleteMerchImage(decodeURIComponent(pathMatch[1]));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Merch image delete error:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  app.get("/api/merch/products", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const products = await storage.getProductsByUser(userId);
      const productsWithVariants = await Promise.all(
        products.map(async (product) => {
          const variants = await storage.getProductVariants(product.id);
          return { ...product, variants };
        })
      );
      res.json(productsWithVariants);
    } catch (error) {
      console.error("Error fetching merch products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Create a new merch product
  app.post("/api/merch/products", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const landingPage = await storage.getLandingPageByUser(userId);
      if (!landingPage) {
        return res.status(400).json({ error: "You must create a landing page before adding merch" });
      }

      const data = insertMerchProductSchema.parse({
        ...req.body,
        userId,
        landingPageId: landingPage.id,
      });

      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating merch product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Update a merch product
  app.patch("/api/merch/products/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating merch product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete a merch product
  app.delete("/api/merch/products/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting merch product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Create a variant for a product
  app.post("/api/merch/products/:id/variants", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const data = insertMerchVariantSchema.parse({
        ...req.body,
        productId: product.id,
      });

      const variant = await storage.createProductVariant(data);
      res.status(201).json(variant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating variant:", error);
      res.status(500).json({ error: "Failed to create variant" });
    }
  });

  // Update a variant
  app.patch("/api/merch/variants/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const variant = await storage.getProductVariant(req.params.id);
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }
      const product = await storage.getProduct(variant.productId);
      if (!product || product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateProductVariant(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating variant:", error);
      res.status(500).json({ error: "Failed to update variant" });
    }
  });

  // Delete a variant
  app.delete("/api/merch/variants/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const variant = await storage.getProductVariant(req.params.id);
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }
      const product = await storage.getProduct(variant.productId);
      if (!product || product.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteProductVariant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting variant:", error);
      res.status(500).json({ error: "Failed to delete variant" });
    }
  });

  // ============================================
  // PUBLIC STOREFRONT (No auth)
  // ============================================

  // Get active merch products for an artist's public page
  app.get("/api/artist/:slug/merch", async (req: Request, res: Response) => {
    try {
      const landingPage = await storage.getLandingPageBySlug(req.params.slug);
      if (!landingPage || !landingPage.isPublished) {
        return res.json({ products: [], checkoutEnabled: false });
      }

      // Respect showMerch toggle
      if (landingPage.showMerch === false) {
        return res.json({ products: [], checkoutEnabled: false });
      }

      const user = await storage.getUser(landingPage.userId);
      if (!user) {
        return res.json({ products: [], checkoutEnabled: false });
      }

      // Check if user has theta tier with active subscription
      const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
      const userTier: SubscriptionTier = isActive ? (user.subscriptionTier as SubscriptionTier) || 'free' : 'free';
      if (!canAccessFeature(userTier, 'merch-selling')) {
        return res.json({ products: [], checkoutEnabled: false });
      }

      // Check if Stripe Connect is ready (for checkout, not for display)
      let checkoutEnabled = false;
      if (user.stripeConnectAccountId) {
        checkoutEnabled = await isAccountReady(user.stripeConnectAccountId);
      }

      const products = await storage.getActiveProductsForLandingPage(landingPage.id);
      res.json({ products, checkoutEnabled });
    } catch (error) {
      console.error("Error fetching public merch:", error);
      res.status(500).json({ error: "Failed to fetch merch" });
    }
  });

  // ============================================
  // MERCH CHECKOUT (No auth - public buyers)
  // ============================================

  app.post("/api/merch/checkout", async (req: Request, res: Response) => {
    try {
      const { items, artistSlug } = req.body as {
        items: Array<{ productId: string; variantId?: string; quantity: number }>;
        artistSlug: string;
      };

      if (!items || !items.length || !artistSlug) {
        return res.status(400).json({ error: "Items and artistSlug are required" });
      }

      // Get artist's landing page and user
      const landingPage = await storage.getLandingPageBySlug(artistSlug);
      if (!landingPage) {
        return res.status(404).json({ error: "Artist not found" });
      }

      const user = await storage.getUser(landingPage.userId);
      if (!user || !user.stripeConnectAccountId) {
        return res.status(400).json({ error: "Artist is not set up for payments" });
      }

      // Build line items and compute total
      const lineItems: Array<{
        price_data: {
          currency: string;
          product_data: { name: string; description?: string };
          unit_amount: number;
        };
        quantity: number;
      }> = [];
      let totalAmount = 0;

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product || !product.isActive) {
          return res.status(400).json({ error: `Product ${item.productId} not found or inactive` });
        }

        let unitPrice = product.basePrice;
        let itemName = product.name;

        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (!variant || !variant.isActive) {
            return res.status(400).json({ error: `Variant ${item.variantId} not found or inactive` });
          }
          if (variant.priceOverride) {
            unitPrice = variant.priceOverride;
          }
          itemName = `${product.name} - ${variant.name}`;

          // Check inventory
          if (variant.inventory !== null && variant.inventory < item.quantity) {
            return res.status(400).json({ error: `Insufficient stock for ${itemName}` });
          }
        }

        lineItems.push({
          price_data: {
            currency: product.currency || 'gbp',
            product_data: {
              name: itemName,
              ...(product.description ? { description: product.description } : {}),
            },
            unit_amount: unitPrice,
          },
          quantity: item.quantity,
        });

        totalAmount += unitPrice * item.quantity;
      }

      const platformFee = calculatePlatformFee(totalAmount);

      const APP_URL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ['GB', 'US', 'CA', 'AU', 'DE', 'FR', 'NL', 'IE'],
        },
        success_url: `${APP_URL}/artist/${artistSlug}?merch_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/artist/${artistSlug}?merch_purchase=cancelled`,
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: user.stripeConnectAccountId,
          },
        },
        metadata: {
          type: 'merch_purchase',
          artistId: user.id,
          items: JSON.stringify(items.map(i => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          }))),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating merch checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ============================================
  // MERCH ORDERS (Theta tier gated)
  // ============================================

  // Get all orders for the authenticated artist
  app.get("/api/merch/orders", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByArtist(req.user!.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching merch orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get a single order with items
  app.get("/api/merch/orders/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.artistId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching merch order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Update an order (status, tracking, notes)
  app.patch("/api/merch/orders/:id", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.artistId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { status, trackingNumber, trackingUrl, notes } = req.body;
      const updateData: Record<string, any> = {};

      if (status !== undefined) updateData.status = status;
      if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
      if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;
      if (notes !== undefined) updateData.notes = notes;

      // Set timestamps based on status changes
      if (status === 'shipped' && order.status !== 'shipped') {
        updateData.shippedAt = new Date();
      }
      if (status === 'delivered' && order.status !== 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const updated = await storage.updateOrder(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating merch order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Get merch analytics for the authenticated artist
  app.get("/api/merch/analytics", requireAuth, requireFeature('merch-selling'), async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByArtist(req.user!.id);

      const revenueStatuses = ['paid', 'shipped', 'delivered'];
      const totalRevenue = orders
        .filter(o => revenueStatuses.includes(o.status))
        .reduce((sum, o) => sum + o.total, 0)
        - orders.filter(o => o.status === 'refunded').reduce((sum, o) => sum + o.total, 0);
      const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
      const pendingShipment = orders.filter(o => o.status === 'paid').length;
      const delivered = orders.filter(o => o.status === 'delivered').length;

      res.json({
        totalRevenue,
        totalOrders,
        pendingShipment,
        delivered,
      });
    } catch (error) {
      console.error("Error fetching merch analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}

// Helper function to format extracted text to HTML for the editor
function formatExtractedTextToHtml(text: string): string {
  if (!text) return '<p></p>';

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map(para => {
      // Trim whitespace
      const trimmed = para.trim();
      if (!trimmed) return '';

      // Check if it looks like a heading (all caps, short)
      if (trimmed.length < 100 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.')) {
        return `<h2>${trimmed}</h2>`;
      }

      // Check if it looks like a numbered section (e.g., "1. Introduction")
      const numberedMatch = trimmed.match(/^(\d+\.)\s+(.+)/);
      if (numberedMatch) {
        return `<h3>${numberedMatch[1]} ${numberedMatch[2]}</h3>`;
      }

      // Regular paragraph - preserve line breaks within
      const withBreaks = trimmed.replace(/\n/g, '<br/>');
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// Helper function to map parsed contract type to internal contract type
function mapParsedTypeToContractType(parsedType: string): string {
  const typeMap: Record<string, string> = {
    collaboration: 'artist',
    licensing: 'licensing',
    touring: 'touring',
    production: 'production',
    business: 'business',
    management: 'management',
    publishing: 'publishing',
    other: 'other'
  };
  return typeMap[parsedType] || 'other';
}

// Async helper to analyze contract without blocking the response
async function analyzeContractAsync(contractId: string, text: string, _contractType: string) {
  try {
    const truncated = truncateForAI(text);
    const result = await analyzeContract(truncated.text);

    if (result && result.analysis) {
      const riskLevel = result.analysis.riskAssessment?.level || 'medium';
      await storage.updateContract(contractId, {
        aiAnalysis: result.analysis,
        aiRiskScore: riskLevel,
        analyzedAt: new Date(),
        analysisVersion: 1,
      });
      console.log(`[AI] Analyzed converted contract ${contractId}: ${riskLevel} risk`);
    }
  } catch (error) {
    console.error(`[AI] Failed to analyze contract ${contractId}:`, error);
  }
}
