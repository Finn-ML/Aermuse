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
import { uploadContractFile, downloadContractFile, getContentType } from "./services/fileStorage";
import { extractText, truncateForAI } from "./services/extraction";
import { analyzeContract, OpenAIError } from "./services/openai";
import { getUserSubscription } from "./services/subscription";

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

  // Generate PDF for template-based contracts
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

      // For uploaded contracts, redirect to regular download
      if (contract.filePath && !contract.renderedContent) {
        return res.redirect(`/api/contracts/${contract.id}/download`);
      }

      // For template contracts, generate PDF from rendered content
      if (!contract.renderedContent) {
        return res.status(400).json({ error: "No content available to generate PDF" });
      }

      const { generatePDF } = await import("./services/pdfGenerator");
      const pdfBuffer = await generatePDF(contract.renderedContent);

      const filename = `${contract.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);

      console.log(`[PDF] Generated PDF for contract ${contract.id}`);
    } catch (error) {
      console.error("[PDF] Generation failed:", error);
      res.status(500).json({ error: "PDF generation failed" });
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

  // Contract Versions - List all versions
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
      res.json({ versions });
    } catch (error) {
      console.error("Get contract versions error:", error);
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
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
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

  return httpServer;
}
