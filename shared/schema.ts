import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer, index, inet } from "drizzle-orm/pg-core";
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
  // Epic 5: Subscription & Billing fields
  stripeCustomerId: varchar("stripe_customer_id", { length: 50 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 50 }),
  subscriptionStatus: text("subscription_status").default("none"),
  subscriptionPriceId: varchar("subscription_price_id", { length: 50 }),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { withTimezone: true }),
  subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end").default(false),
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

// Contract Folders table (Story 8.3)
export const contractFolders = pgTable("contract_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }), // Hex color: #FF5733
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractFolderSchema = createInsertSchema(contractFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContractFolder = z.infer<typeof insertContractFolderSchema>;
export type ContractFolder = typeof contractFolders.$inferSelect;

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  folderId: varchar("folder_id").references(() => contractFolders.id, { onDelete: "set null" }), // Story 8.3
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
  // Epic 9: Theme customization fields
  themeId: text("theme_id"),
  accentColor: text("accent_color").default("#FFD700"),
  textColor: text("text_color").default("#FFFFFF"),
  headingFont: text("heading_font").default("Inter"),
  bodyFont: text("body_font").default("Inter"),
  buttonStyle: text("button_style").default("rounded"),
  backgroundType: text("background_type").default("solid"),
  backgroundValue: text("background_value"),
  backgroundOverlay: text("background_overlay").default("none"),
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

// ============================================
// SYSTEM SETTINGS TABLE (Epic 6: Admin)
// ============================================

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// ============================================
// ADMIN ACTIVITY LOG TABLE (Epic 6: Admin)
// ============================================

export const adminActivityLog = pgTable("admin_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id", { length: 36 }).notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }), // Supports IPv6
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertAdminActivitySchema = createInsertSchema(adminActivityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminActivity = z.infer<typeof insertAdminActivitySchema>;
export type AdminActivity = typeof adminActivityLog.$inferSelect;

// ============================================
// PROPOSALS TABLE (Epic 7: Landing Page Enhancements)
// ============================================

// Proposal type enum values
export const PROPOSAL_TYPES = ['collaboration', 'licensing', 'booking', 'recording', 'distribution', 'other'] as const;
export type ProposalType = typeof PROPOSAL_TYPES[number];

// Proposal status enum values
export const PROPOSAL_STATUSES = ['new', 'viewed', 'responded', 'archived'] as const;
export type ProposalStatus = typeof PROPOSAL_STATUSES[number];

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Foreign keys
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Sender information
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  senderEmail: varchar("sender_email", { length: 255 }).notNull(),
  senderCompany: varchar("sender_company", { length: 255 }),

  // Proposal content
  proposalType: text("proposal_type").notNull().default('other'), // collaboration, licensing, booking, recording, distribution, other
  message: text("message").notNull(),

  // Status tracking
  status: text("status").notNull().default('new'), // new, viewed, responded, archived
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),

  // Link to created contract (if converted)
  contractId: varchar("contract_id").references(() => contracts.id),

  // Metadata for spam prevention
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  landingPageIdx: index('idx_proposals_landing_page').on(table.landingPageId),
  userIdIdx: index('idx_proposals_user_id').on(table.userId),
  statusIdx: index('idx_proposals_status').on(table.status),
  createdAtIdx: index('idx_proposals_created_at').on(table.createdAt),
}));

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// Proposals relations
export const proposalsRelations = relations(proposals, ({ one }) => ({
  landingPage: one(landingPages, {
    fields: [proposals.landingPageId],
    references: [landingPages.id],
  }),
  user: one(users, {
    fields: [proposals.userId],
    references: [users.id],
  }),
  contract: one(contracts, {
    fields: [proposals.contractId],
    references: [contracts.id],
  }),
}));
