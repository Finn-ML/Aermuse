import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertContractSchema, insertLandingPageSchema, insertLandingPageLinkSchema } from "@shared/schema";
import { validateFormData, renderTemplateContent, generateHTML, generateText } from "./services/templateRenderer";
import { validateTemplateStructure } from "./services/templateValidation";
import type { TemplateFormData, TemplateField, OptionalClause, TemplateContent } from "@shared/types/templates";
import { z } from "zod";
import { hashPassword, comparePassword, generateSecureToken } from "./lib/auth";
import { authLimiter, aiLimiter } from "./middleware/rateLimit";
import { sendPasswordResetEmail, sendVerificationEmail, sendAccountDeletionEmail } from "./services/postmark";
import rateLimit from "express-rate-limit";
import { requireAdmin, requireAuth } from "./middleware/auth";
import multer from "multer";
import { upload, verifyFileType } from "./middleware/upload";
import { uploadContractFile, downloadContractFile, getContentType, uploadSignedPdf } from "./services/fileStorage";
import { extractText, truncateForAI } from "./services/extraction";
import { analyzeContract, OpenAIError } from "./services/openai";
import { getUserSubscription } from "./services/subscription";
import { generateContractPdf, sanitizeFilename, generateContractPDFFromRecord } from "./services/pdfGenerator";
import { getDocuSealService, DocuSealServiceError } from "./services/docuseal";
import { signatureRequests, signatories, insertSignatureRequestSchema, insertSignatorySchema } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";
import crypto from "crypto";
import { sendSignatureRequestEmail, sendSignatureCancelledEmail, sendSignatureConfirmationEmail, sendDocumentCompletedEmail } from "./services/postmark";

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

  // AI Contract Analysis (GPT-4)
  app.post("/api/contracts/:id/analyze", aiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
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

      // Update status to analyzing
      await storage.updateContract(contract.id, { status: 'analyzing' });

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
      const updatedContract = await storage.updateContract(contract.id, {
        aiAnalysis: analysis,
        aiRiskScore: riskScore,
        analyzedAt: new Date(),
        analysisVersion: (contract.analysisVersion || 0) + 1,
        status: 'analyzed'
      });

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

  // ============================================
  // BILLING ROUTES (Epic 5)
  // ============================================

  // Helper middleware to require auth (hoisted for billing routes)
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  // Create checkout session
  app.post("/api/billing/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Dynamic import to avoid module load issues when Stripe key not set
      const stripe = await import("./services/stripe");

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if already subscribed
      if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
        return res.status(400).json({
          error: "You already have an active subscription",
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

      // Create checkout session
      const session = await stripe.createCheckoutSession({
        customerId,
        userId: user.id,
        successUrl: `${stripe.stripeConfig.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${stripe.stripeConfig.appUrl}/pricing?canceled=true`,
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

  // Verify checkout success
  app.get("/api/billing/checkout/verify/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      // Dynamic import
      const { stripe } = await import("./services/stripe");
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Verify session belongs to this user
      if (session.metadata?.userId !== userId) {
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
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        await storage.updateUser(userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: subscription.status === 'active' || subscription.status === 'trialing' ? subscription.status : 'active',
          subscriptionPriceId: subscription.items.data[0]?.price.id || null,
          subscriptionCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
        } as any);
        console.log(`[BILLING] Synced subscription ${subscriptionId} for user ${userId}: active`);
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

      const { password, ...safeUser } = updated;
      console.log(`[ADMIN] User ${id} role changed to ${role} by ${(req.session as any).userId}`);
      res.json(safeUser);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
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

      const { templateId, formData, title } = req.body as {
        templateId: string;
        formData: TemplateFormData;
        title?: string;
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

      // Get max sort order
      const allTemplates = await storage.getAllTemplates();
      const maxSortOrder = allTemplates.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), 0);

      const template = await storage.createTemplate({
        name,
        description,
        category,
        content,
        fields: fields || [],
        optionalClauses: optionalClauses || [],
        isActive: true,
        sortOrder: maxSortOrder + 1,
        version: 1,
        createdBy: (req.session as any).userId
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

      const template = await storage.updateTemplate(req.params.id, {
        name,
        description,
        category,
        content,
        fields: fields || [],
        optionalClauses: optionalClauses || [],
        version: (existing.version ?? 1) + 1
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
        isActive: true,
        sortOrder: maxSortOrder + 1,
        version: 1,
        createdBy: (req.session as any).userId
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

  // POST /api/signatures/request - Create signature request
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

      // Generate PDF from contract
      console.log(`[SIGNATURES] Generating PDF for contract ${input.contractId}`);
      const pdfBuffer = await generateContractPDFFromRecord(contract);

      // Upload to DocuSeal
      console.log(`[SIGNATURES] Uploading to DocuSeal`);
      const docusealService = getDocuSealService();
      const filename = `${contract.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const docusealDoc = await docusealService.uploadDocument(pdfBuffer, filename);

      // Calculate expiration
      const expiresAt = input.expiresAt
        ? new Date(input.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      // Create batch signature requests in DocuSeal
      console.log(`[SIGNATURES] Creating batch request for ${input.signatories.length} signers`);
      const batchResponse = await docusealService.createBatchSignatureRequests({
        documentId: docusealDoc.id,
        signers: input.signatories.map((s, i) => ({
          signerName: s.name,
          signerEmail: s.email.toLowerCase(),
          signingOrder: i + 1,
        })),
        expiresAt: expiresAt.toISOString(),
      });

      // Create local signature request record
      const [signatureRequest] = await db
        .insert(signatureRequests)
        .values({
          contractId: input.contractId,
          initiatorId: userId,
          docusealDocumentId: docusealDoc.id,
          status: 'pending',
          signingOrder: 'sequential',
          message: input.message || null,
          expiresAt,
        })
        .returning();

      // Create signatory records
      const signatoryRecords = await Promise.all(
        batchResponse.signatureRequests.map(async (sr, index) => {
          const signerInput = input.signatories[index];

          // Check if signer is a registered user
          const existingUser = await storage.getUserByEmail(signerInput.email.toLowerCase());

          const [signatory] = await db
            .insert(signatories)
            .values({
              signatureRequestId: signatureRequest.id,
              docusealRequestId: sr.id,
              signingToken: sr.signingToken,
              signingUrl: sr.signingUrl,
              email: signerInput.email.toLowerCase(),
              name: signerInput.name,
              userId: existingUser?.id || null,
              signingOrder: sr.signingOrder,
              status: sr.signingOrder === 1 ? 'pending' : 'waiting',
            })
            .returning();

          return signatory;
        })
      );

      // Update contract status
      await storage.updateContract(input.contractId, { status: 'pending_signature' } as any);

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

      // TODO: Send reminder email via postmark
      console.log(`[SIGNATURES] Reminder would be sent to ${signatory.email} for request ${request.id}`);

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
      const { status } = req.query;

      let query = db
        .select()
        .from(signatureRequests)
        .where(eq(signatureRequests.initiatorId, userId));

      const requests = await query.orderBy(desc(signatureRequests.createdAt)).limit(50);

      // Filter by status if provided
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

  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.DOCUSEAL_WEBHOOK_SECRET || '';

  // Register webhook with DocuSeal on startup
  async function registerDocuSealWebhook() {
    try {
      const appUrl = process.env.APP_URL || process.env.BASE_URL ||
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      const webhookUrl = `${appUrl}/api/webhooks/docuseal`;

      console.log(`[WEBHOOK] Registering webhook with DocuSeal at: ${webhookUrl}`);

      const docusealService = getDocuSealService();

      // First, list existing webhooks
      const existingWebhooks = await docusealService.listWebhooks();
      console.log(`[WEBHOOK] Found ${existingWebhooks.length} existing webhooks:`);
      existingWebhooks.forEach(w => console.log(`  - ${w.id}: ${w.url} (events: ${w.events?.join(', ') || 'all'})`));

      const existingWebhook = existingWebhooks.find(w => w.url === webhookUrl);

      if (existingWebhook) {
        console.log(`[WEBHOOK] Webhook already registered: ${existingWebhook.id}`);
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
        console.log(`[WEBHOOK] IMPORTANT: Set WEBHOOK_SECRET=${registration.secret} in your environment`);
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
          await handleNextSignerReady(payload);
          break;
        case 'document.completed':
          await handleDocumentCompleted(payload);
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

      // Find the signatory by DocuSeal request ID or email
      const [signatory] = await db
        .select()
        .from(signatories)
        .where(
          or(
            eq(signatories.docusealRequestId, String(signatureRequestId)),
            eq(signatories.email, signerEmail?.toLowerCase())
          )
        );

      if (!signatory) {
        console.warn(`[WEBHOOK] Signatory not found for signatureRequestId: ${signatureRequestId}, email: ${signerEmail}`);
        console.warn(`[WEBHOOK] Full payload: ${JSON.stringify(payload)}`);
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
  async function handleNextSignerReady(payload: any) {
    try {
      // Handle both possible field naming conventions from DocuSeal
      const signatureRequestId = payload.signatureRequestId || payload.signature_request_id || payload.signer_id;
      const signerEmail = payload.signerEmail || payload.signer_email;
      const signerName = payload.signerName || payload.signer_name;
      const signingUrl = payload.signingUrl || payload.signing_url;
      const submissionId = payload.submissionId || payload.submission_id || payload.documentId;

      console.log(`[WEBHOOK] Next signer ready - payload keys: ${Object.keys(payload).join(', ')}`);
      console.log(`[WEBHOOK] Next signer ready: ${signerEmail} for submission ${submissionId}, requestId: ${signatureRequestId}`);

      // Find the signatory
      const [signatory] = await db
        .select()
        .from(signatories)
        .where(
          or(
            eq(signatories.docusealRequestId, String(signatureRequestId)),
            eq(signatories.email, signerEmail?.toLowerCase())
          )
        );

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

        // Send signature request email
        sendSignatureRequestEmail(
          signatory.email,
          signatory.name,
          initiator?.name || 'Someone',
          contract?.name || 'Contract',
          signingUrl || signatory.signingUrl || '',
          request.message
        ).catch((err: Error) => console.error('[WEBHOOK] Failed to send request email:', err));
      }
    } catch (error) {
      console.error('[WEBHOOK] Error handling signature.next_signer_ready:', error);
    }
  }

  // Handle document completion (all signatures done)
  async function handleDocumentCompleted(payload: any) {
    try {
      // Handle both possible field naming conventions from DocuSeal
      const documentId = payload.documentId || payload.document_id;
      const submissionId = payload.submissionId || payload.submission_id;
      const signedContent = payload.signedContent || payload.signed_content;

      console.log(`[WEBHOOK] Document completed - payload keys: ${Object.keys(payload).join(', ')}`);
      console.log(`[WEBHOOK] Document completed: ${documentId}, submissionId: ${submissionId}`);
      console.log(`[WEBHOOK] Has signedContent: ${!!signedContent}`);

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

      // Get signed PDF - either from webhook payload or by downloading from DocuSeal
      let signedPdfPath: string | null = null;

      try {
        let signedPdfBuffer: Buffer;

        if (signedContent) {
          // Use base64-encoded PDF from webhook payload
          console.log(`[WEBHOOK] Using signedContent from webhook payload`);
          signedPdfBuffer = Buffer.from(signedContent, 'base64');
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
        console.error('[WEBHOOK] Failed to download/store signed PDF:', downloadError);
      }

      // Update signature request status
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

      console.log(`[WEBHOOK] Request ${request.id} marked as completed`);

      // Get all signatories and send completion emails
      const requestSignatories = await db
        .select()
        .from(signatories)
        .where(eq(signatories.signatureRequestId, request.id));

      const contract = await storage.getContract(request.contractId);
      const initiator = await storage.getUser(request.initiatorId);
      const downloadUrl = signedPdfPath
        ? `${process.env.APP_URL || process.env.BASE_URL || 'http://localhost:5000'}/api/contracts/${request.contractId}/signed-pdf`
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

  return httpServer;
}
