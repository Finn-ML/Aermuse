import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertContractSchema, insertLandingPageSchema, insertLandingPageLinkSchema } from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

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
        return res.status(400).json({ error: "Email already in use" });
      }

      const user = await storage.createUser({
        ...data,
        password: hashPassword(data.password),
        avatarInitials: data.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      });

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
      if (!user || user.password !== hashPassword(password)) {
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

  return httpServer;
}
