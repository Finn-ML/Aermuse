# Story 4.2: Signature Request Data Model

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.2 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Signature Request Data Model |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** local database tables to track signing requests
**So that** we can sync status and provide history

## Context

While DocuSeal handles the actual signing process, Aermuse needs local database tables to:
- Track which contracts have signature requests
- Store signing URLs for each signatory
- Sync status updates from webhooks
- Provide audit trail and history
- Link signed contracts to registered user accounts

**Dependencies:**
- Story 4.1 (DocuSeal Integration Service) for types reference
- Existing `contracts` and `users` tables

## Acceptance Criteria

- [ ] **AC-1:** `signature_requests` table created with Drizzle schema
- [ ] **AC-2:** `signatories` table created with Drizzle schema
- [ ] **AC-3:** Store DocuSeal document ID and request IDs
- [ ] **AC-4:** Track signing URLs for each signatory
- [ ] **AC-5:** Status fields match DocuSeal status flow
- [ ] **AC-6:** Foreign keys to contracts and users tables
- [ ] **AC-7:** Timestamps for audit trail
- [ ] **AC-8:** Database migration created and tested
- [ ] **AC-9:** TypeScript types exported for use in routes

## Technical Requirements

### Database Schema

```sql
-- Signature requests (one per contract signing flow)
CREATE TABLE signature_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  initiator_id VARCHAR(36) NOT NULL REFERENCES users(id),

  -- DocuSeal reference
  docuseal_document_id VARCHAR(100),

  -- Request configuration
  status TEXT NOT NULL DEFAULT 'pending',
  signing_order TEXT NOT NULL DEFAULT 'sequential',
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Completion tracking
  completed_at TIMESTAMP WITH TIME ZONE,
  signed_pdf_path TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual signatories (one per signer)
CREATE TABLE signatories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id VARCHAR(36) NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,

  -- DocuSeal references
  docuseal_request_id VARCHAR(100),
  signing_token VARCHAR(100),
  signing_url TEXT,

  -- Signer information
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id VARCHAR(36) REFERENCES users(id),

  -- Signing order and status
  signing_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting',
  signed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_signature_requests_contract ON signature_requests(contract_id);
CREATE INDEX idx_signature_requests_initiator ON signature_requests(initiator_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_docuseal ON signature_requests(docuseal_document_id);

CREATE INDEX idx_signatories_request ON signatories(signature_request_id);
CREATE INDEX idx_signatories_user ON signatories(user_id);
CREATE INDEX idx_signatories_email ON signatories(email);
CREATE INDEX idx_signatories_docuseal ON signatories(docuseal_request_id);
CREATE INDEX idx_signatories_status ON signatories(status);
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/db/schema/signatures.ts` | New: Drizzle schema |
| `server/db/schema/index.ts` | Export new tables |
| `server/db/migrations/XXXX_add_signatures.ts` | Migration file |
| `shared/types/signatures.ts` | Shared TypeScript types |

### Drizzle Schema Implementation

```typescript
// server/db/schema/signatures.ts
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { contracts } from './contracts';

// ============================================
// SIGNATURE REQUESTS TABLE
// ============================================

export const signatureRequests = pgTable(
  'signature_requests',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    contractId: varchar('contract_id', { length: 36 })
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),

    initiatorId: varchar('initiator_id', { length: 36 })
      .notNull()
      .references(() => users.id),

    // DocuSeal reference
    docusealDocumentId: varchar('docuseal_document_id', { length: 100 }),

    // Configuration
    status: text('status').notNull().default('pending'),
    signingOrder: text('signing_order').notNull().default('sequential'),
    message: text('message'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Completion
    completedAt: timestamp('completed_at', { withTimezone: true }),
    signedPdfPath: text('signed_pdf_path'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    contractIdx: index('idx_signature_requests_contract').on(table.contractId),
    initiatorIdx: index('idx_signature_requests_initiator').on(table.initiatorId),
    statusIdx: index('idx_signature_requests_status').on(table.status),
    docusealIdx: index('idx_signature_requests_docuseal').on(table.docusealDocumentId),
  })
);

// ============================================
// SIGNATORIES TABLE
// ============================================

export const signatories = pgTable(
  'signatories',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    signatureRequestId: varchar('signature_request_id', { length: 36 })
      .notNull()
      .references(() => signatureRequests.id, { onDelete: 'cascade' }),

    // DocuSeal references
    docusealRequestId: varchar('docuseal_request_id', { length: 100 }),
    signingToken: varchar('signing_token', { length: 100 }),
    signingUrl: text('signing_url'),

    // Signer information
    email: text('email').notNull(),
    name: text('name').notNull(),
    userId: varchar('user_id', { length: 36 }).references(() => users.id),

    // Order and status
    signingOrder: integer('signing_order').notNull().default(1),
    status: text('status').notNull().default('waiting'),
    signedAt: timestamp('signed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    requestIdx: index('idx_signatories_request').on(table.signatureRequestId),
    userIdx: index('idx_signatories_user').on(table.userId),
    emailIdx: index('idx_signatories_email').on(table.email),
    docusealIdx: index('idx_signatories_docuseal').on(table.docusealRequestId),
    statusIdx: index('idx_signatories_status').on(table.status),
  })
);

// ============================================
// RELATIONS
// ============================================

export const signatureRequestsRelations = relations(
  signatureRequests,
  ({ one, many }) => ({
    contract: one(contracts, {
      fields: [signatureRequests.contractId],
      references: [contracts.id],
    }),
    initiator: one(users, {
      fields: [signatureRequests.initiatorId],
      references: [users.id],
    }),
    signatories: many(signatories),
  })
);

export const signatoriesRelations = relations(signatories, ({ one }) => ({
  signatureRequest: one(signatureRequests, {
    fields: [signatories.signatureRequestId],
    references: [signatureRequests.id],
  }),
  user: one(users, {
    fields: [signatories.userId],
    references: [users.id],
  }),
}));

// ============================================
// TYPES
// ============================================

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type NewSignatureRequest = typeof signatureRequests.$inferInsert;
export type Signatory = typeof signatories.$inferSelect;
export type NewSignatory = typeof signatories.$inferInsert;

// Status type unions
export type SignatureRequestStatus =
  | 'pending'      // Created, waiting for first signature
  | 'in_progress'  // At least one signature collected
  | 'completed'    // All signatures collected
  | 'expired'      // Past expiration date
  | 'cancelled';   // Cancelled by initiator

export type SignatoryStatus =
  | 'waiting'  // Sequential: waiting for previous signers
  | 'pending'  // Ready to sign
  | 'signed';  // Completed

export type SigningOrder = 'sequential' | 'parallel';
```

### Schema Index Export

```typescript
// server/db/schema/index.ts
export * from './users';
export * from './contracts';
export * from './signatures';  // Add this line
```

### Shared Types

```typescript
// shared/types/signatures.ts
export interface SignatureRequestDTO {
  id: string;
  contractId: string;
  initiatorId: string;
  docusealDocumentId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  signingOrder: 'sequential' | 'parallel';
  message: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  signedPdfPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatoryDTO {
  id: string;
  signatureRequestId: string;
  docusealRequestId: string | null;
  signingToken: string | null;
  signingUrl: string | null;
  email: string;
  name: string;
  userId: string | null;
  signingOrder: number;
  status: 'waiting' | 'pending' | 'signed';
  signedAt: string | null;
  createdAt: string;
}

export interface SignatureRequestWithSignatories extends SignatureRequestDTO {
  signatories: SignatoryDTO[];
}

export interface CreateSignatureRequestDTO {
  contractId: string;
  signatories: {
    name: string;
    email: string;
  }[];
  message?: string;
  expiresAt?: string;
}
```

### Status Flow Diagram

```
SIGNATURE REQUEST STATUS:
========================
                    ┌─────────────┐
                    │   pending   │ (Initial state)
                    └──────┬──────┘
                           │ First signature
                           ▼
                    ┌─────────────┐
                    │ in_progress │
                    └──────┬──────┘
                           │ All signed
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ completed │ │  expired  │ │ cancelled │
       └───────────┘ └───────────┘ └───────────┘


SIGNATORY STATUS:
=================
┌──────────┐     ┌──────────┐     ┌──────────┐
│ waiting  │────▶│ pending  │────▶│  signed  │
└──────────┘     └──────────┘     └──────────┘
(Sequential:     (Ready to        (Completed)
 not their       sign)
 turn yet)
```

## Definition of Done

- [ ] Drizzle schema files created
- [ ] Database migration runs successfully
- [ ] All indexes created
- [ ] Foreign key constraints working
- [ ] Relations properly defined
- [ ] TypeScript types exported
- [ ] Shared types available to client
- [ ] Schema matches DocuSeal status values
- [ ] Unit tests for type exports

## Testing Checklist

### Database Tests

- [ ] Migration applies cleanly
- [ ] Migration rolls back cleanly
- [ ] Indexes exist after migration
- [ ] Foreign key constraints enforced
- [ ] Cascade delete works (contract → signature_requests → signatories)

### Query Tests

```typescript
// Example queries to test
describe('Signature Request Queries', () => {
  it('creates signature request with signatories', async () => {
    const [request] = await db.insert(signatureRequests)
      .values({
        contractId: testContract.id,
        initiatorId: testUser.id,
        status: 'pending',
      })
      .returning();

    await db.insert(signatories)
      .values([
        {
          signatureRequestId: request.id,
          email: 'signer1@test.com',
          name: 'Signer 1',
          signingOrder: 1,
          status: 'pending',
        },
        {
          signatureRequestId: request.id,
          email: 'signer2@test.com',
          name: 'Signer 2',
          signingOrder: 2,
          status: 'waiting',
        },
      ]);

    const result = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.id, request.id),
      with: { signatories: true },
    });

    expect(result?.signatories).toHaveLength(2);
  });

  it('cascades delete from contract to signatories', async () => {
    // Delete contract
    await db.delete(contracts).where(eq(contracts.id, testContract.id));

    // Signature request and signatories should be deleted
    const requests = await db.query.signatureRequests.findMany({
      where: eq(signatureRequests.contractId, testContract.id),
    });
    expect(requests).toHaveLength(0);
  });

  it('finds pending requests for user as initiator', async () => {
    const pending = await db.query.signatureRequests.findMany({
      where: and(
        eq(signatureRequests.initiatorId, testUser.id),
        eq(signatureRequests.status, 'pending')
      ),
    });
    expect(pending.length).toBeGreaterThan(0);
  });

  it('finds pending signatures for user as signatory', async () => {
    const toSign = await db.query.signatories.findMany({
      where: and(
        eq(signatories.userId, testUser.id),
        eq(signatories.status, 'pending')
      ),
      with: { signatureRequest: { with: { contract: true } } },
    });
    expect(toSign.length).toBeGreaterThan(0);
  });
});
```

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.1: DocuSeal Integration Service](./4-1-docuseal-integration-service.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)
