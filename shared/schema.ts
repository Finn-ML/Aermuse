import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { TemplateContent, TemplateField, OptionalClause, TemplateFormData } from "./types/templates";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  artistName: text("artist_name"),
  avatarInitials: text("avatar_initials"),
  plan: text("plan").default("free"),
  // Epic 1: Auth & Security fields
  role: text("role").default("user"), // 'user' | 'admin'
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Contract Templates table (Epic 3)
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'artist' | 'licensing' | 'touring' | 'production' | 'business'
  content: jsonb("content").notNull().$type<TemplateContent>(),
  fields: jsonb("fields").notNull().$type<TemplateField[]>().default([]),
  optionalClauses: jsonb("optional_clauses").$type<OptionalClause[]>().default([]),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  version: integer("version").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplates.$inferSelect;

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'record_deal', 'sync_license', 'distribution', 'publishing', 'management'
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'completed', 'expired'
  partnerName: text("partner_name"),
  partnerLogo: text("partner_logo"),
  value: text("value"),
  expiryDate: timestamp("expiry_date"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  filePath: text("file_path"), // Path in Object Storage
  fileSize: integer("file_size"), // Size in bytes
  fileType: text("file_type"), // 'pdf' | 'doc' | 'docx'
  extractedText: text("extracted_text"), // Text extracted from PDF/DOCX
  aiAnalysis: jsonb("ai_analysis"),
  aiRiskScore: text("ai_risk_score"),
  analyzedAt: timestamp("analyzed_at"), // When AI analysis was performed
  analysisVersion: integer("analysis_version").default(0), // Version counter for re-analysis
  signedAt: timestamp("signed_at"),
  // Epic 3: Template-based contracts
  templateId: varchar("template_id").references(() => contractTemplates.id),
  templateData: jsonb("template_data").$type<TemplateFormData>(),
  renderedContent: text("rendered_content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts, {
  // Override JSONB fields to avoid type inference issues
  templateData: z.any().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Contract versions table - stores historical versions of contracts
export const contractVersions = pgTable("contract_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(),
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  extractedText: text("extracted_text"),
  aiAnalysis: jsonb("ai_analysis"),
  aiRiskScore: text("ai_risk_score"),
  analyzedAt: timestamp("analyzed_at"),
  notes: text("notes"), // User can add notes about what changed in this version
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContractVersionSchema = createInsertSchema(contractVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertContractVersion = z.infer<typeof insertContractVersionSchema>;
export type ContractVersion = typeof contractVersions.$inferSelect;

// Landing pages table
export const landingPages = pgTable("landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  slug: text("slug").notNull().unique(),
  artistName: text("artist_name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  primaryColor: text("primary_color").default("#660033"),
  secondaryColor: text("secondary_color").default("#F7E6CA"),
  socialLinks: jsonb("social_links"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type LandingPage = typeof landingPages.$inferSelect;

// Link items for landing pages
export const landingPageLinks = pgTable("landing_page_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  enabled: boolean("enabled").default(true),
  order: text("order").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLandingPageLinkSchema = createInsertSchema(landingPageLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertLandingPageLink = z.infer<typeof insertLandingPageLinkSchema>;
export type LandingPageLink = typeof landingPageLinks.$inferSelect;

// ============================================
// SIGNATURE REQUESTS TABLE (Epic 4: E-Signing)
// ============================================

export const signatureRequests = pgTable("signature_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Foreign keys
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  initiatorId: varchar("initiator_id").notNull().references(() => users.id),

  // DocuSeal reference
  docusealDocumentId: varchar("docuseal_document_id", { length: 100 }),

  // Configuration
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, expired, cancelled
  signingOrder: text("signing_order").notNull().default("sequential"), // sequential, parallel
  message: text("message"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  // Completion tracking
  completedAt: timestamp("completed_at", { withTimezone: true }),
  signedPdfPath: text("signed_pdf_path"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type SignatureRequest = typeof signatureRequests.$inferSelect;

// Status type unions for signature requests
export type SignatureRequestStatus =
  | 'pending'      // Created, waiting for first signature
  | 'in_progress'  // At least one signature collected
  | 'completed'    // All signatures collected
  | 'expired'      // Past expiration date
  | 'cancelled';   // Cancelled by initiator

export type SigningOrder = 'sequential' | 'parallel';

// ============================================
// SIGNATORIES TABLE (Epic 4: E-Signing)
// ============================================

export const signatories = pgTable("signatories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Foreign key to signature request
  signatureRequestId: varchar("signature_request_id").notNull().references(() => signatureRequests.id, { onDelete: 'cascade' }),

  // DocuSeal references
  docusealRequestId: varchar("docuseal_request_id", { length: 100 }),
  signingToken: varchar("signing_token", { length: 100 }),
  signingUrl: text("signing_url"),

  // Signer information
  email: text("email").notNull(),
  name: text("name").notNull(),
  userId: varchar("user_id").references(() => users.id), // Optional: link to registered user

  // Order and status
  signingOrder: integer("signing_order").notNull().default(1),
  status: text("status").notNull().default("waiting"), // waiting, pending, signed
  signedAt: timestamp("signed_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertSignatorySchema = createInsertSchema(signatories).omit({
  id: true,
  createdAt: true,
});

export type InsertSignatory = z.infer<typeof insertSignatorySchema>;
export type Signatory = typeof signatories.$inferSelect;

// Status type union for signatories
export type SignatoryStatus =
  | 'waiting'  // Sequential: waiting for previous signers
  | 'pending'  // Ready to sign
  | 'signed';  // Completed
