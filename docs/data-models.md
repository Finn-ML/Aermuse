# Data Models

## Overview

The Aermuse database uses PostgreSQL with Drizzle ORM. All schemas are defined in `shared/schema.ts` and shared between frontend and backend for type safety.

## Database: PostgreSQL (Neon Serverless)

Connection via `@neondatabase/serverless` with WebSocket support.

---

## Tables

### Users (`users`)

User accounts for authentication and profile management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR | PK, DEFAULT uuid | Unique user identifier |
| `email` | TEXT | NOT NULL, UNIQUE | Login email |
| `password` | TEXT | NOT NULL | Hashed password (SHA-256) |
| `name` | TEXT | NOT NULL | Display name |
| `artist_name` | TEXT | | Stage/artist name |
| `avatar_initials` | TEXT | | 2-letter avatar initials |
| `plan` | TEXT | DEFAULT 'free' | Subscription tier |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation time |

**Schema Definition:**
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  artistName: text("artist_name"),
  avatarInitials: text("avatar_initials"),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

### Contracts (`contracts`)

Music industry contracts for management and AI analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR | PK, DEFAULT uuid | Unique contract identifier |
| `user_id` | VARCHAR | NOT NULL, FK -> users.id | Owner reference |
| `name` | TEXT | NOT NULL | Contract name |
| `type` | TEXT | NOT NULL | Contract type |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | Current status |
| `partner_name` | TEXT | | Other party name |
| `partner_logo` | TEXT | | Partner logo URL |
| `value` | TEXT | | Contract monetary value |
| `expiry_date` | TIMESTAMP | | Contract expiration |
| `file_url` | TEXT | | Uploaded file URL |
| `file_name` | TEXT | | Original file name |
| `ai_analysis` | JSONB | | AI analysis results |
| `ai_risk_score` | TEXT | | Risk level (low/medium/high) |
| `signed_at` | TIMESTAMP | | Signature timestamp |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update time |

**Contract Types:**
- `record_deal` - Record label deals
- `sync_license` - Sync licensing agreements
- `distribution` - Distribution contracts
- `publishing` - Publishing deals
- `management` - Management agreements

**Contract Statuses:**
- `pending` - Awaiting review/signature
- `active` - Signed and active
- `completed` - Fulfilled/expired
- `expired` - Past expiry date

**Schema Definition:**
```typescript
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  partnerName: text("partner_name"),
  partnerLogo: text("partner_logo"),
  value: text("value"),
  expiryDate: timestamp("expiry_date"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  aiAnalysis: jsonb("ai_analysis"),
  aiRiskScore: text("ai_risk_score"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

### Landing Pages (`landing_pages`)

Customizable artist landing pages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR | PK, DEFAULT uuid | Page identifier |
| `user_id` | VARCHAR | NOT NULL, FK -> users.id | Owner reference |
| `slug` | TEXT | NOT NULL, UNIQUE | URL slug |
| `artist_name` | TEXT | NOT NULL | Display name |
| `tagline` | TEXT | | Short description |
| `bio` | TEXT | | Artist biography |
| `avatar_url` | TEXT | | Profile image URL |
| `cover_image_url` | TEXT | | Header image URL |
| `primary_color` | TEXT | DEFAULT '#660033' | Theme primary |
| `secondary_color` | TEXT | DEFAULT '#F7E6CA' | Theme secondary |
| `social_links` | JSONB | | Social media links |
| `is_published` | BOOLEAN | DEFAULT false | Public visibility |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update time |

**Schema Definition:**
```typescript
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
```

---

### Landing Page Links (`landing_page_links`)

Individual links on artist landing pages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR | PK, DEFAULT uuid | Link identifier |
| `landing_page_id` | VARCHAR | NOT NULL, FK -> landing_pages.id | Parent page |
| `title` | TEXT | NOT NULL | Link display text |
| `url` | TEXT | NOT NULL | Link destination |
| `icon` | TEXT | | Icon identifier |
| `enabled` | BOOLEAN | DEFAULT true | Visibility toggle |
| `order` | TEXT | DEFAULT '0' | Sort order |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation time |

**Schema Definition:**
```typescript
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
```

---

## Entity Relationships

```
┌─────────────┐       ┌──────────────┐       ┌────────────────────┐
│    users    │       │   contracts  │       │   landing_pages    │
├─────────────┤       ├──────────────┤       ├────────────────────┤
│ id (PK)     │──┬───▶│ user_id (FK) │       │ id (PK)            │
│ email       │  │    │ id (PK)      │       │ user_id (FK)       │◀──┐
│ password    │  │    │ name         │       │ slug               │   │
│ name        │  │    │ type         │       │ artist_name        │   │
│ artist_name │  │    │ status       │       │ tagline            │   │
│ plan        │  │    │ ...          │       │ ...                │   │
└─────────────┘  │    └──────────────┘       └────────────────────┘   │
                 │                                     │               │
                 │    ┌────────────────────────────────┘               │
                 │    │                                                │
                 │    ▼                                                │
                 │    ┌────────────────────┐                           │
                 │    │ landing_page_links │                           │
                 │    ├────────────────────┤                           │
                 └───▶│ id (PK)            │                           │
                      │ landing_page_id(FK)│───────────────────────────┘
                      │ title              │
                      │ url                │
                      │ enabled            │
                      └────────────────────┘
```

## Zod Validation Schemas

Insert schemas are auto-generated using `drizzle-zod`:

```typescript
import { createInsertSchema } from "drizzle-zod";

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPageLinkSchema = createInsertSchema(landingPageLinks).omit({
  id: true,
  createdAt: true,
});
```

## TypeScript Types

```typescript
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type LandingPage = typeof landingPages.$inferSelect;

export type InsertLandingPageLink = z.infer<typeof insertLandingPageLinkSchema>;
export type LandingPageLink = typeof landingPageLinks.$inferSelect;
```

## Migrations

Drizzle Kit configuration (`drizzle.config.ts`):

```typescript
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

**Commands:**
- `npm run db:push` - Push schema changes to database

---
*Generated: 2025-11-28 | 4 tables documented*
