import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer, index, uniqueIndex, inet, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { TemplateContent, TemplateField, OptionalClause, TemplateFormData, PersonaGroup } from "./types/templates";

// Session table for connect-pg-simple (persistent auth sessions)
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: true }).notNull(),
}, (table) => ({
  expireIdx: index('IDX_session_expire').on(table.expire),
}));

// Subscription tier type (Epic 12)
export type SubscriptionTier = 'free' | 'beta' | 'alpha' | 'theta';

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
  // Stripe Connect for artist payouts
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 50 }),
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false),
  // Epic 12: Subscription Tier
  subscriptionTier: text("subscription_tier").default("free").$type<SubscriptionTier>(),
  // AI Disclaimer acceptance
  aiDisclaimerAcceptedAt: timestamp("ai_disclaimer_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schema for subscription tier validation
const subscriptionTierSchema = z.enum(['free', 'beta', 'alpha', 'theta']).nullable().optional();

export const insertUserSchema = createInsertSchema(users, {
  subscriptionTier: subscriptionTierSchema,
}).omit({
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
  personaGroups: jsonb("persona_groups").$type<PersonaGroup[]>().default([]),
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
  backgroundPosition: text("background_position").default("cover"), // 'cover' | 'contain' (Story 9.13)
  // Epic 9.6: Social icons bar
  socialIcons: jsonb("social_icons").default([]),
  showSocialBar: boolean("show_social_bar").default(true),
  // Epic 9.8: Layout options
  layout: text("layout").default("centered"), // 'centered' | 'left' | 'right'
  avatarPosition: text("avatar_position").default("top"), // 'top' | 'left' | 'hidden'
  linkWidth: text("link_width").default("full"), // 'full' | 'medium' | 'compact'
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
  // Epic 9.7: Link type (link or header for section headers)
  type: text("type").default("link"), // 'link' | 'header' | 'video_embed'
  // Epic 9.9: Video embeds (Pro feature)
  videoUrl: text("video_url"), // For video embeds (YouTube, Vimeo, Spotify)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLandingPageLinkSchema = createInsertSchema(landingPageLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertLandingPageLink = z.infer<typeof insertLandingPageLinkSchema>;
export type LandingPageLink = typeof landingPageLinks.$inferSelect;

// ============================================
// ANALYTICS TABLES (Epic 10: Analytics & Insights)
// ============================================

// Page views table - tracks landing page visits
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(), // SHA-256 of IP + UA
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }), // Updated on page unload/visibility change
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  landingPageIdx: index('idx_page_views_landing_page').on(table.landingPageId),
  visitorHashIdx: index('idx_page_views_visitor_hash').on(table.visitorHash),
  startedAtIdx: index('idx_page_views_started_at').on(table.startedAt),
}));

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;

// Link clicks table - tracks link clicks on landing pages
export const linkClicks = pgTable("link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").notNull().references(() => landingPageLinks.id, { onDelete: 'cascade' }),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  pageViewId: varchar("page_view_id").references(() => pageViews.id, { onDelete: 'set null' }),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  linkIdIdx: index('idx_link_clicks_link_id').on(table.linkId),
  landingPageIdx: index('idx_link_clicks_landing_page').on(table.landingPageId),
}));

export const insertLinkClickSchema = createInsertSchema(linkClicks).omit({
  id: true,
});

export type InsertLinkClick = z.infer<typeof insertLinkClickSchema>;
export type LinkClick = typeof linkClicks.$inferSelect;

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
// AI USAGE TRACKING TABLE (Epic 6: Admin)
// ============================================

export const aiUsage = pgTable("ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  usageDate: timestamp("usage_date", { withTimezone: true }).notNull(), // Date of usage (truncated to day)
  analysisCount: integer("analysis_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_ai_usage_user_date').on(table.userId, table.usageDate),
}));

export const insertAiUsageSchema = createInsertSchema(aiUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;
export type AiUsage = typeof aiUsage.$inferSelect;

// ============================================
// PROPOSALS TABLE (Epic 7: Landing Page Enhancements)
// ============================================

// Proposal type enum values
export const PROPOSAL_TYPES = ['collaboration', 'licensing', 'booking', 'recording', 'distribution', 'other'] as const;
export type ProposalType = typeof PROPOSAL_TYPES[number];

// Proposal status enum values (Epic 13: added in_review, pending_signature for contract workflow)
export const PROPOSAL_STATUSES = ['new', 'viewed', 'in_review', 'pending_signature', 'responded', 'archived'] as const;
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

  // Epic 13: Contract attachment fields
  hasContract: boolean("has_contract").default(false),
  contractFileName: text("contract_file_name"),
  contractFilePath: text("contract_file_path"),  // Path in Object Storage
  contractFileSize: integer("contract_file_size"), // Size in bytes
  contractFileType: text("contract_file_type"),   // 'pdf' | 'doc' | 'docx'
  contractExtractedText: text("contract_extracted_text"),
  contractAiAnalysis: jsonb("contract_ai_analysis"),
  contractAiRiskScore: text("contract_ai_risk_score"), // 'low' | 'medium' | 'high'
  contractAnalyzedAt: timestamp("contract_analyzed_at", { withTimezone: true }),

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
  hasContractIdx: index('idx_proposals_has_contract').on(table.hasContract), // Epic 13
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

// ============================================
// MUSIC TRACKS TABLE (Music Store Feature)
// ============================================

// Pricing type enum values
export const PRICING_TYPES = ['fixed', 'pwyw'] as const;
export type PricingType = typeof PRICING_TYPES[number];

export const tracks = pgTable("tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Track metadata
  title: text("title").notNull(),
  artistName: text("artist_name"), // Override if different from landing page
  description: text("description"),

  // Pricing (stored in cents for precision)
  priceInCents: integer("price_in_cents").notNull(),
  currency: varchar("currency", { length: 3 }).default("gbp"),

  // PWYW (Pay What You Want) pricing options
  pricingType: text("pricing_type").default("fixed").$type<PricingType>(), // 'fixed' | 'pwyw'
  minimumPriceInCents: integer("minimum_price_in_cents").default(0), // Minimum price for PWYW (0 = free with tip)
  suggestedPriceInCents: integer("suggested_price_in_cents"), // Optional suggested price for PWYW

  // Free streaming option
  allowFreeStreaming: boolean("allow_free_streaming").default(false), // Allow full track to be streamed for free

  // File storage paths (Replit Object Storage)
  originalFilePath: text("original_file_path").notNull(),
  previewFilePath: text("preview_file_path"), // 30-sec preview (generated)
  coverArtPath: text("cover_art_path"),

  // File metadata
  originalFileName: text("original_file_name").notNull(),
  fileFormat: varchar("file_format", { length: 10 }).notNull(), // 'mp3' | 'wav'
  fileSizeBytes: integer("file_size_bytes").notNull(),
  durationSeconds: integer("duration_seconds"),
  previewStartSeconds: integer("preview_start_seconds").default(0),

  // Stripe integration
  stripeProductId: varchar("stripe_product_id", { length: 50 }),
  stripePriceId: varchar("stripe_price_id", { length: 50 }),

  // Display options
  displayOrder: integer("display_order").default(0),
  isPublished: boolean("is_published").default(false),

  // Collaboration splits verification
  splitsConfigured: boolean("splits_configured").default(false), // Has artist set up splits?
  splitsVerified: boolean("splits_verified").default(false), // Are all splits verified/expired?
  ownerSplitPercentage: real("owner_split_percentage").default(100), // Artist's own percentage (0-100)
  splitsSubmittedAt: timestamp("splits_submitted_at", { withTimezone: true }), // When splits were first submitted
  autoPublishAt: timestamp("auto_publish_at", { withTimezone: true }), // 2 weeks after splits submitted

  // Analytics
  playCount: integer("play_count").default(0),
  purchaseCount: integer("purchase_count").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  landingPageIdx: index('idx_tracks_landing_page').on(table.landingPageId),
  userIdIdx: index('idx_tracks_user_id').on(table.userId),
  publishedIdx: index('idx_tracks_published').on(table.isPublished),
  autoPublishIdx: index('idx_tracks_auto_publish').on(table.autoPublishAt),
}));

// Zod schema for pricing type validation
const pricingTypeSchema = z.enum(['fixed', 'pwyw']).nullable().optional();

export const insertTrackSchema = createInsertSchema(tracks, {
  pricingType: pricingTypeSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;

// ============================================
// TRACK PURCHASES TABLE (Music Store Feature)
// ============================================

export const trackPurchases = pgTable("track_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: 'cascade' }),

  // Buyer information
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  buyerUserId: varchar("buyer_user_id").references(() => users.id), // Optional: link to registered user

  // Stripe payment details
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 50 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 100 }),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  currency: varchar("currency", { length: 3 }).default("gbp"),

  // Download access
  downloadToken: varchar("download_token", { length: 64 }).notNull().unique(),
  downloadCount: integer("download_count").default(0),
  maxDownloads: integer("max_downloads").default(5),
  downloadExpiresAt: timestamp("download_expires_at", { withTimezone: true }),

  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'refunded'

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  trackIdIdx: index('idx_track_purchases_track').on(table.trackId),
  buyerEmailIdx: index('idx_track_purchases_email').on(table.buyerEmail),
  downloadTokenIdx: index('idx_track_purchases_token').on(table.downloadToken),
  statusIdx: index('idx_track_purchases_status').on(table.status),
}));

export const insertTrackPurchaseSchema = createInsertSchema(trackPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertTrackPurchase = z.infer<typeof insertTrackPurchaseSchema>;
export type TrackPurchase = typeof trackPurchases.$inferSelect;

// Track purchase status type
export type TrackPurchaseStatus = 'pending' | 'completed' | 'refunded';

// ============================================
// MUSIC TRACKS RELATIONS
// ============================================

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  landingPage: one(landingPages, {
    fields: [tracks.landingPageId],
    references: [landingPages.id],
  }),
  user: one(users, {
    fields: [tracks.userId],
    references: [users.id],
  }),
  purchases: many(trackPurchases),
  splits: many(trackSplits),
}));

export const trackPurchasesRelations = relations(trackPurchases, ({ one }) => ({
  track: one(tracks, {
    fields: [trackPurchases.trackId],
    references: [tracks.id],
  }),
  buyer: one(users, {
    fields: [trackPurchases.buyerUserId],
    references: [users.id],
  }),
}));

// ============================================
// TRACK SPLITS TABLE (Collaboration Verification)
// ============================================

// Split status type
export type TrackSplitStatus = 'pending' | 'verified' | 'rejected' | 'expired';

// Collaborator role type
export const COLLABORATOR_ROLES = ['artist', 'producer', 'writer', 'composer', 'performer', 'label', 'other'] as const;
export type CollaboratorRole = typeof COLLABORATOR_ROLES[number];

export const trackSplits = pgTable("track_splits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: 'cascade' }),

  // Collaborator info
  collaboratorName: text("collaborator_name").notNull(),
  collaboratorEmail: text("collaborator_email").notNull(),
  collaboratorRole: text("collaborator_role").default("artist").$type<CollaboratorRole>(),

  // Split percentage (0-100)
  splitPercentage: real("split_percentage").notNull(),

  // Linked user (if registered on Aermuse)
  collaboratorUserId: varchar("collaborator_user_id").references(() => users.id),

  // Stripe payout destination
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 50 }),

  // Producer license agreement references
  contractId: varchar("contract_id").references(() => contracts.id),
  signatureRequestId: varchar("signature_request_id").references(() => signatureRequests.id),

  // Verification status
  status: text("status").notNull().default("pending").$type<TrackSplitStatus>(),
  verificationToken: varchar("verification_token", { length: 64 }).unique(),
  verificationSentAt: timestamp("verification_sent_at", { withTimezone: true }),
  verificationDeadline: timestamp("verification_deadline", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  // Reminder tracking
  reminderSentCount: integer("reminder_sent_count").default(0),
  lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  trackIdIdx: index('idx_track_splits_track_id').on(table.trackId),
  collaboratorEmailIdx: index('idx_track_splits_collaborator_email').on(table.collaboratorEmail),
  statusIdx: index('idx_track_splits_status').on(table.status),
  verificationTokenIdx: index('idx_track_splits_verification_token').on(table.verificationToken),
  deadlineIdx: index('idx_track_splits_deadline').on(table.verificationDeadline),
}));

export const insertTrackSplitSchema = createInsertSchema(trackSplits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrackSplit = z.infer<typeof insertTrackSplitSchema>;
export type TrackSplit = typeof trackSplits.$inferSelect;

// ============================================
// TRACK SPLITS RELATIONS
// ============================================

export const trackSplitsRelations = relations(trackSplits, ({ one }) => ({
  track: one(tracks, {
    fields: [trackSplits.trackId],
    references: [tracks.id],
  }),
  collaboratorUser: one(users, {
    fields: [trackSplits.collaboratorUserId],
    references: [users.id],
  }),
}));

// ============================================
// ARTIST VIDEOS TABLE (Video Store Feature)
// ============================================

export const artistVideos = pgTable("artist_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Video metadata
  title: text("title").notNull(),
  description: text("description"),

  // File storage paths (Replit Object Storage)
  originalFilePath: text("original_file_path").notNull(),
  previewFilePath: text("preview_file_path"), // 10-sec preview (generated)
  thumbnailPath: text("thumbnail_path"),

  // File metadata
  originalFileName: text("original_file_name").notNull(),
  fileFormat: varchar("file_format", { length: 10 }).notNull(), // 'mp4' | 'webm' | 'mov'
  fileSizeBytes: integer("file_size_bytes").notNull(),
  durationSeconds: integer("duration_seconds"),

  // Paywall settings
  isPaywalled: boolean("is_paywalled").default(false),
  priceInCents: integer("price_in_cents"),
  currency: varchar("currency", { length: 3 }).default("gbp"),

  // PWYW pricing options
  pricingType: text("pricing_type").default("fixed").$type<PricingType>(), // 'fixed' | 'pwyw'
  minimumPriceInCents: integer("minimum_price_in_cents").default(0),

  // Stripe integration
  stripeProductId: varchar("stripe_product_id", { length: 50 }),
  stripePriceId: varchar("stripe_price_id", { length: 50 }),

  // Display options
  displayOrder: integer("display_order").default(0),
  isPublished: boolean("is_published").default(false),

  // Analytics
  viewCount: integer("view_count").default(0),
  purchaseCount: integer("purchase_count").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  landingPageIdx: index('idx_artist_videos_landing_page').on(table.landingPageId),
  userIdIdx: index('idx_artist_videos_user_id').on(table.userId),
  publishedIdx: index('idx_artist_videos_published').on(table.isPublished),
}));

export const insertArtistVideoSchema = createInsertSchema(artistVideos, {
  pricingType: pricingTypeSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArtistVideo = z.infer<typeof insertArtistVideoSchema>;
export type ArtistVideo = typeof artistVideos.$inferSelect;

// ============================================
// VIDEO PURCHASES TABLE (Video Store Feature)
// ============================================

export const videoPurchases = pgTable("video_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => artistVideos.id, { onDelete: 'cascade' }),

  // Buyer information
  buyerEmail: text("buyer_email").notNull(),
  buyerName: text("buyer_name"),
  buyerUserId: varchar("buyer_user_id").references(() => users.id),

  // Stripe payment details
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 50 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 100 }),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  currency: varchar("currency", { length: 3 }).default("gbp"),

  // Access control
  accessToken: varchar("access_token", { length: 64 }).notNull().unique(),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),

  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'refunded'

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  videoIdIdx: index('idx_video_purchases_video').on(table.videoId),
  buyerEmailIdx: index('idx_video_purchases_email').on(table.buyerEmail),
  accessTokenIdx: index('idx_video_purchases_token').on(table.accessToken),
  statusIdx: index('idx_video_purchases_status').on(table.status),
}));

export const insertVideoPurchaseSchema = createInsertSchema(videoPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertVideoPurchase = z.infer<typeof insertVideoPurchaseSchema>;
export type VideoPurchase = typeof videoPurchases.$inferSelect;

// Video purchase status type
export type VideoPurchaseStatus = 'pending' | 'completed' | 'refunded';

// ============================================
// ARTIST VIDEOS RELATIONS
// ============================================

export const artistVideosRelations = relations(artistVideos, ({ one, many }) => ({
  landingPage: one(landingPages, {
    fields: [artistVideos.landingPageId],
    references: [landingPages.id],
  }),
  user: one(users, {
    fields: [artistVideos.userId],
    references: [users.id],
  }),
  purchases: many(videoPurchases),
}));

export const videoPurchasesRelations = relations(videoPurchases, ({ one }) => ({
  video: one(artistVideos, {
    fields: [videoPurchases.videoId],
    references: [artistVideos.id],
  }),
  buyer: one(users, {
    fields: [videoPurchases.buyerUserId],
    references: [users.id],
  }),
}));

// ============================================
// MERCH PRODUCTS TABLE (Merch Store Feature)
// ============================================

export const merchProducts = pgTable("merch_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  images: jsonb("images").default([]),
  basePrice: integer("base_price").notNull(),
  currency: text("currency").default("gbp"),
  weight: integer("weight"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  stripeProductId: text("stripe_product_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMerchProductSchema = createInsertSchema(merchProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMerchProduct = z.infer<typeof insertMerchProductSchema>;
export type MerchProduct = typeof merchProducts.$inferSelect;

// ============================================
// MERCH VARIANTS TABLE (Merch Store Feature)
// ============================================

export const merchVariants = pgTable("merch_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => merchProducts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  size: text("size"),
  color: text("color"),
  sku: text("sku"),
  priceOverride: integer("price_override"),
  inventory: integer("inventory").default(0).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchVariantSchema = createInsertSchema(merchVariants).omit({
  id: true,
  createdAt: true,
});

export type InsertMerchVariant = z.infer<typeof insertMerchVariantSchema>;
export type MerchVariant = typeof merchVariants.$inferSelect;

// ============================================
// MERCH ORDERS TABLE (Merch Store Feature)
// ============================================

export const merchOrders = pgTable("merch_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  shippingAddress: jsonb("shipping_address"),
  subtotal: integer("subtotal").notNull(),
  shippingCost: integer("shipping_cost").default(0),
  platformFee: integer("platform_fee").default(0),
  total: integer("total").notNull(),
  currency: text("currency").default("gbp"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;
export type MerchOrder = typeof merchOrders.$inferSelect;

// ============================================
// MERCH ORDER ITEMS TABLE (Merch Store Feature)
// ============================================

export const merchOrderItems = pgTable("merch_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => merchOrders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => merchProducts.id),
  variantId: varchar("variant_id").references(() => merchVariants.id),
  productName: text("product_name").notNull(),
  variantName: text("variant_name"),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchOrderItemSchema = createInsertSchema(merchOrderItems).omit({
  id: true,
  createdAt: true,
});

export type InsertMerchOrderItem = z.infer<typeof insertMerchOrderItemSchema>;
export type MerchOrderItem = typeof merchOrderItems.$inferSelect;

// ============================================
// MAILING LIST SUBSCRIBERS TABLE (Mailing List Feature)
// ============================================

export const mailingListSubscribers = pgTable("mailing_list_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => landingPages.id),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").default("pending"), // pending | active | unsubscribed
  confirmationToken: varchar("confirmation_token", { length: 64 }),
  subscribedAt: timestamp("subscribed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("mailing_list_subscribers_page_email_idx").on(table.landingPageId, table.email),
]);

export const insertMailingListSubscriberSchema = createInsertSchema(mailingListSubscribers).omit({
  id: true,
  createdAt: true,
});

export type InsertMailingListSubscriber = z.infer<typeof insertMailingListSubscriberSchema>;
export type MailingListSubscriber = typeof mailingListSubscribers.$inferSelect;

// ============================================
// EMAIL CAMPAIGNS TABLE (Mailing List Feature)
// ============================================

export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  previewText: text("preview_text"),
  status: text("status").default("draft"), // draft | scheduled | sending | sent | failed
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;

// ============================================
// EMAIL SENDS TABLE (Mailing List Feature)
// ============================================

export const emailSends = pgTable("email_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => emailCampaigns.id),
  subscriberId: varchar("subscriber_id").notNull().references(() => mailingListSubscribers.id),
  postmarkMessageId: varchar("postmark_message_id"),
  status: text("status").default("queued"), // queued | sent | delivered | bounced | failed
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
});

export const insertEmailSendSchema = createInsertSchema(emailSends).omit({
  id: true,
});

export type InsertEmailSend = z.infer<typeof insertEmailSendSchema>;
export type EmailSend = typeof emailSends.$inferSelect;

// ============================================
// EMAIL LINK CLICKS TABLE (Mailing List Feature)
// ============================================

export const emailLinkClicks = pgTable("email_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sendId: varchar("send_id").notNull().references(() => emailSends.id),
  url: text("url").notNull(),
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const insertEmailLinkClickSchema = createInsertSchema(emailLinkClicks).omit({
  id: true,
});

export type InsertEmailLinkClick = z.infer<typeof insertEmailLinkClickSchema>;
export type EmailLinkClick = typeof emailLinkClicks.$inferSelect;
