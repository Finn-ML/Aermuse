# Story 7.1: Proposal Data Model

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.1 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Proposal Data Model |
| **Priority** | P2 - Medium |
| **Story Points** | 1 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to store incoming proposals
**So that** artists can manage them

## Context

The proposal system allows external parties to contact artists through their landing pages. This foundational story creates the database schema and Drizzle ORM models needed to store and manage proposals.

**Dependencies:**
- Landing Pages feature (existing)

## Acceptance Criteria

- [ ] **AC-1:** `proposals` table created with migration
- [ ] **AC-2:** Fields include: id, landing_page_id, user_id, sender_name, sender_email, sender_company, proposal_type, message, status
- [ ] **AC-3:** Status enum values: new, viewed, responded, archived
- [ ] **AC-4:** Proposal type enum: collaboration, licensing, booking, recording, distribution, other
- [ ] **AC-5:** Drizzle schema with relations defined
- [ ] **AC-6:** Indexes for efficient querying

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/proposals.ts` | New: Proposals schema |
| `server/db/schema/index.ts` | Export proposals |
| `server/db/migrations/XXXX_create_proposals.sql` | New: Migration |

### Implementation

#### Drizzle Schema

```typescript
// server/db/schema/proposals.ts
import { pgTable, varchar, text, timestamp, inet, pgEnum, index } from 'drizzle-orm/pg-core';
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
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  landingPageId: varchar('landing_page_id', { length: 36 })
    .notNull()
    .references(() => landingPages.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Sender information
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderCompany: varchar('sender_company', { length: 255 }),

  // Proposal content
  proposalType: proposalTypeEnum('proposal_type').notNull().default('other'),
  message: text('message').notNull(),

  // Status tracking
  status: proposalStatusEnum('status').notNull().default('new'),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),

  // Link to created contract
  contractId: varchar('contract_id', { length: 36 }).references(() => contracts.id),

  // Metadata for spam prevention
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  landingPageIdx: index('idx_proposals_landing_page').on(table.landingPageId),
  userIdIdx: index('idx_proposals_user_id').on(table.userId),
  statusIdx: index('idx_proposals_status').on(table.status),
  createdAtIdx: index('idx_proposals_created_at').on(table.createdAt),
}));

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

// TypeScript types
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type ProposalType = typeof proposalTypeEnum.enumValues[number];
export type ProposalStatus = typeof proposalStatusEnum.enumValues[number];
```

#### Export from Schema Index

```typescript
// server/db/schema/index.ts (add to existing exports)
export * from './proposals';
```

#### SQL Migration

```sql
-- server/db/migrations/XXXX_create_proposals.sql

-- Create enum types
CREATE TYPE proposal_type AS ENUM (
  'collaboration',
  'licensing',
  'booking',
  'recording',
  'distribution',
  'other'
);

CREATE TYPE proposal_status AS ENUM (
  'new',
  'viewed',
  'responded',
  'archived'
);

-- Create proposals table
CREATE TABLE proposals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id VARCHAR(36) NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sender info
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_company VARCHAR(255),

  -- Proposal details
  proposal_type proposal_type NOT NULL DEFAULT 'other',
  message TEXT NOT NULL,

  -- Status
  status proposal_status NOT NULL DEFAULT 'new',
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Link to contract if converted
  contract_id VARCHAR(36) REFERENCES contracts(id),

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_proposals_landing_page ON proposals(landing_page_id);
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Definition of Done

- [ ] Migration runs successfully
- [ ] Drizzle schema generates correct types
- [ ] Relations work correctly
- [ ] Indexes created for performance
- [ ] Enums properly defined

## Testing Checklist

### Unit Tests

- [ ] Schema types are correct
- [ ] Default values applied

### Integration Tests

- [ ] Can insert proposals
- [ ] Can query by landing page
- [ ] Can query by user
- [ ] Cascade delete works

## Related Documents

- [Epic 7 Tech Spec](./tech-spec-epic-7.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create Drizzle Schema for Proposals**
  - [ ] Create `server/db/schema/proposals.ts` file
  - [ ] Define proposal type enum with all required values
  - [ ] Define proposal status enum with all required values
  - [ ] Create proposals table schema with all fields
  - [ ] Add indexes for landing_page_id, user_id, status, and created_at
  - [ ] Define relations to users, landingPages, and contracts tables
  - [ ] Export TypeScript types for Proposal, NewProposal, ProposalType, ProposalStatus

- [ ] **Task 2: Update Schema Index**
  - [ ] Add proposals export to `server/db/schema/index.ts`
  - [ ] Verify all exports are properly typed

- [ ] **Task 3: Create Database Migration**
  - [ ] Create SQL migration file `server/db/migrations/XXXX_create_proposals.sql`
  - [ ] Add CREATE TYPE statements for proposal_type and proposal_status enums
  - [ ] Add CREATE TABLE statement for proposals with all columns
  - [ ] Add foreign key references to landing_pages, users, and contracts
  - [ ] Create indexes for efficient querying
  - [ ] Add updated_at trigger for automatic timestamp updates

- [ ] **Task 4: Verify Schema Integration**
  - [ ] Run migration to verify it executes without errors
  - [ ] Test Drizzle schema generates correct TypeScript types
  - [ ] Verify relations work correctly with existing tables
  - [ ] Validate all enum values are properly constrained

- [ ] **Task 5: Testing**
  - [ ] Write unit tests for schema types and default values
  - [ ] Write integration tests for inserting proposals
  - [ ] Test querying by landing page and user
  - [ ] Verify cascade delete behavior works correctly

---

## Dev Agent Record

### Debug Log
<!-- Automatically updated by dev agent during implementation -->

### Completion Notes
<!-- Summary of implementation, decisions made, any follow-ups needed -->

---

## File List

| Action | File Path |
|--------|-----------|
| | |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| | | |
