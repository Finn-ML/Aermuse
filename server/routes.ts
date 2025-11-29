import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertContractSchema, insertLandingPageSchema, insertLandingPageLinkSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, comparePassword, generateSecureToken } from "./lib/auth";
import { authLimiter } from "./middleware/rateLimit";
import { sendPasswordResetEmail, sendVerificationEmail, sendAccountDeletionEmail } from "./services/postmark";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "./middleware/auth";
import multer from "multer";
import { upload, verifyFileType } from "./middleware/upload";
import { uploadContractFile, downloadContractFile, getContentType } from "./services/fileStorage";

// Rate limiter for resend verification (1 per 5 minutes)
const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1,
  message: { error: 'Please wait 5 minutes before requesting another verification email' },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
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
      sendVerificationEmail(user.email, verificationToken, user.name).catch((err) => {
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

      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

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
      sendPasswordResetEmail(user.email, token, user.name).catch((err) => {
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

      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
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

      await sendVerificationEmail(user.email, verificationToken, user.name);

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

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
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

  // Contracts routes
  app.get("/api/contracts", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contracts = await storage.getContractsByUser(userId);
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

      res.json(contract);
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

  // AI Contract Analysis (simulated)
  app.post("/api/contracts/:id/analyze", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const contract = await storage.getContract(req.params.id);
      if (!contract || contract.userId !== userId) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Simulated AI analysis results
      const analysis = {
        summary: "This contract outlines terms for exclusive distribution rights with standard industry provisions.",
        keyTerms: [
          { term: "Exclusivity Period", value: "3 years", risk: "medium" },
          { term: "Revenue Split", value: "70/30 in artist's favor", risk: "low" },
          { term: "Territory", value: "Worldwide", risk: "low" },
          { term: "Termination Clause", value: "90 days notice required", risk: "medium" },
        ],
        redFlags: [
          "The exclusivity period is longer than industry standard (2 years)",
          "No performance minimum requirements specified",
        ],
        recommendations: [
          "Negotiate for a shorter exclusivity period of 2 years",
          "Add minimum performance thresholds for the distributor",
          "Include a break clause at 18 months if targets aren't met",
        ],
        overallScore: 72,
        analyzedAt: new Date().toISOString(),
      };

      const riskScore = analysis.overallScore >= 80 ? "low" : analysis.overallScore >= 60 ? "medium" : "high";

      const updatedContract = await storage.updateContract(req.params.id, {
        aiAnalysis: analysis,
        aiRiskScore: riskScore,
      });

      res.json({ contract: updatedContract, analysis });
    } catch (error) {
      console.error("Analyze contract error:", error);
      res.status(500).json({ error: "Failed to analyze contract" });
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

      // Update contract with file info
      const updatedContract = await storage.updateContract(contract.id, {
        filePath: uploaded.path,
        fileName: req.file.originalname,
        fileSize: uploaded.size,
        fileType: verification.type,
      });

      console.log(`[UPLOAD] File uploaded: ${contract.id} (${verification.type}, ${uploaded.size} bytes)`);

      res.json({ contract: updatedContract });
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

  // Admin Routes - Protected by requireAdmin middleware
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

  // Admin users list (placeholder for Epic 6)
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

      res.json({ templates });
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

      res.json(template);
    } catch (error) {
      console.error("Get template error:", error);
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  return httpServer;
}
