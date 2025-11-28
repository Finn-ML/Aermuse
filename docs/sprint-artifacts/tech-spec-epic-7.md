# Epic 7: Landing Page Enhancements - Technical Specification

## Overview

This epic adds a proposal system to artist landing pages, allowing external parties (labels, venues, collaborators) to send business inquiries directly to artists through their Aermuse page.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Landing Page (Public)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Artist Profile + Send Proposal Button                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Proposal Form Modal (No Auth Required)                   │   │
│  │  - Name, Email, Company, Type, Message                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Proposal API │→ │ Rate Limiter │→ │ Email Notification   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Artist Dashboard                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Proposals List + Management                              │   │
│  │  - View, Respond, Archive, Delete                         │   │
│  │  - Convert to Contract                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Proposal types enum
CREATE TYPE proposal_type AS ENUM (
  'collaboration',
  'licensing',
  'booking',
  'recording',
  'distribution',
  'other'
);

-- Proposal status enum
CREATE TYPE proposal_status AS ENUM (
  'new',
  'viewed',
  'responded',
  'archived'
);

-- Main proposals table
CREATE TABLE proposals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id VARCHAR(36) NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sender info (external party)
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_company VARCHAR(255),

  -- Proposal details
  proposal_type proposal_type NOT NULL DEFAULT 'other',
  message TEXT NOT NULL,

  -- Status tracking
  status proposal_status NOT NULL DEFAULT 'new',
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Linked contract (if converted)
  contract_id VARCHAR(36) REFERENCES contracts(id),

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proposals_landing_page ON proposals(landing_page_id);
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
```

### Drizzle Schema

```typescript
// server/db/schema/proposals.ts
import { pgTable, varchar, text, timestamp, inet, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { landingPages } from './landingPages';
import { contracts } from './contracts';

export const proposalTypeEnum = pgEnum('proposal_type', [
  'collaboration',
  'licensing',
  'booking',
  'recording',
  'distribution',
  'other',
]);

export const proposalStatusEnum = pgEnum('proposal_status', [
  'new',
  'viewed',
  'responded',
  'archived',
]);

export const proposals = pgTable('proposals', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  landingPageId: varchar('landing_page_id', { length: 36 })
    .notNull()
    .references(() => landingPages.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderCompany: varchar('sender_company', { length: 255 }),

  proposalType: proposalTypeEnum('proposal_type').notNull().default('other'),
  message: text('message').notNull(),

  status: proposalStatusEnum('status').notNull().default('new'),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),

  contractId: varchar('contract_id', { length: 36 }).references(() => contracts.id),

  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
```

## API Design

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/proposals` | Submit a new proposal |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/proposals` | List user's proposals |
| GET | `/api/proposals/:id` | Get proposal details |
| PATCH | `/api/proposals/:id` | Update status |
| DELETE | `/api/proposals/:id` | Delete proposal |
| POST | `/api/proposals/:id/contract` | Convert to contract |

### Rate Limiting

```typescript
// Proposal submission rate limiting
const proposalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 proposals per hour per IP
  message: { error: 'Too many proposals. Please try again later.' },
  keyGenerator: (req) => req.ip,
});
```

## Security Considerations

1. **Rate Limiting**: Prevent spam by limiting proposals per IP
2. **Input Validation**: Sanitize all user inputs
3. **Email Validation**: Verify email format
4. **CAPTCHA (Optional)**: Consider adding reCAPTCHA for high-traffic pages
5. **IP Logging**: Store IP for abuse tracking
6. **Content Filtering**: Basic profanity/spam detection

## Email Templates

### New Proposal Notification

```
Subject: New proposal for [Landing Page Title]

Hi [Artist Name],

You've received a new [Proposal Type] proposal through your Aermuse page!

From: [Sender Name]
Email: [Sender Email]
Company: [Company or "Not specified"]

Message:
[Message Preview - first 200 chars]

View the full proposal and respond:
[View Proposal Button]

Best,
The Aermuse Team
```

## Story Summary

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| 7.1 | Proposal Data Model | 1 | High |
| 7.2 | Send Proposal Button | 1 | High |
| 7.3 | Proposal Submission Form | 3 | High |
| 7.4 | Proposal Notification | 2 | High |
| 7.5 | Proposal Management Dashboard | 3 | High |
| 7.6 | Proposal to Contract Flow | 2 | Medium |

**Total: 12 story points**

## Dependencies

- Landing Pages feature (existing)
- Email service (existing)
- Contracts system (for proposal-to-contract flow)

## Testing Strategy

### Unit Tests
- Form validation
- Rate limiter logic
- Status transitions

### Integration Tests
- Proposal submission flow
- Email notification delivery
- Dashboard CRUD operations

### E2E Tests
- Full proposal submission journey
- Proposal management workflow
- Convert to contract flow
