# Story 4.9: Signed Document Storage

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.9 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Signed Document Storage |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** party to a signed contract
**I want** the final signed copy stored in my account
**So that** I have a record

## Context

When all signatures are collected, the signed PDF must be downloaded from DocuSeal and stored in Aermuse. This story handles the storage, access control, and distribution to all parties including registered signatories.

**Dependencies:**
- Story 4.5 (Webhook Handler) triggers storage on `document.completed`
- File storage infrastructure

## Acceptance Criteria

- [ ] **AC-1:** Download signed PDF from DocuSeal when complete
- [ ] **AC-2:** Store PDF in Aermuse file storage
- [ ] **AC-3:** Link PDF to contract record
- [ ] **AC-4:** Contract status updated to "signed"
- [ ] **AC-5:** Signed PDF downloadable for initiator
- [ ] **AC-6:** Signed PDF accessible to registered signatories
- [ ] **AC-7:** Audit trail preserved (who signed when)
- [ ] **AC-8:** Download endpoint with proper authorization
- [ ] **AC-9:** Handle storage failures gracefully

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/signedPdfStorage.ts` | PDF storage service |
| `server/routes/contracts.ts` | Add download endpoint |
| `server/db/schema/contracts.ts` | Add signedPdfPath field |
| `server/db/schema/sharedContracts.ts` | New: Shared access table |

### Database Updates

```sql
-- Add signed PDF path to contracts
ALTER TABLE contracts ADD COLUMN signed_pdf_path TEXT;

-- Shared contract access for signatories
CREATE TABLE shared_contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'signatory',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contract_id)
);

CREATE INDEX idx_shared_contracts_user ON shared_contracts(user_id);
CREATE INDEX idx_shared_contracts_contract ON shared_contracts(contract_id);
```

### Implementation

#### Storage Service

```typescript
// server/services/signedPdfStorage.ts
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORAGE_DIR = process.env.SIGNED_PDF_STORAGE_DIR || './uploads/signed';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface StorageResult {
  path: string;
  filename: string;
  size: number;
  hash: string;
}

/**
 * Store a signed PDF and return storage details
 */
export async function storeSignedPdf(
  pdfBuffer: Buffer,
  contractId: string,
  contractTitle: string
): Promise<StorageResult> {
  // Validate buffer
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Empty PDF buffer');
  }

  if (pdfBuffer.length > MAX_FILE_SIZE) {
    throw new Error('PDF exceeds maximum file size');
  }

  // Validate PDF magic bytes
  const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
  if (pdfHeader !== '%PDF-') {
    throw new Error('Invalid PDF format');
  }

  // Ensure storage directory exists
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const safeTitle = contractTitle
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 50)
    .toLowerCase();
  const filename = `signed_${safeTitle}_${contractId.slice(0, 8)}_${timestamp}_${random}.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  // Calculate hash for integrity
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // Write file
  await fs.writeFile(filepath, pdfBuffer);

  console.log(`[STORAGE] Signed PDF stored: ${filepath} (${pdfBuffer.length} bytes, hash: ${hash.slice(0, 16)}...)`);

  return {
    path: filepath,
    filename,
    size: pdfBuffer.length,
    hash,
  };
}

/**
 * Read a signed PDF by path
 */
export async function readSignedPdf(filepath: string): Promise<Buffer> {
  // Validate path is within storage directory
  const absolutePath = path.resolve(filepath);
  const storageAbsolute = path.resolve(STORAGE_DIR);

  if (!absolutePath.startsWith(storageAbsolute)) {
    throw new Error('Invalid storage path');
  }

  return fs.readFile(filepath);
}

/**
 * Check if a signed PDF exists
 */
export async function signedPdfExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a signed PDF (for cleanup)
 */
export async function deleteSignedPdf(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
    console.log(`[STORAGE] Signed PDF deleted: ${filepath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
}> {
  const files = await fs.readdir(STORAGE_DIR);
  let totalSize = 0;

  for (const file of files) {
    const stat = await fs.stat(path.join(STORAGE_DIR, file));
    totalSize += stat.size;
  }

  return {
    totalFiles: files.length,
    totalSize,
  };
}
```

#### Drizzle Schema for Shared Contracts

```typescript
// server/db/schema/sharedContracts.ts
import { pgTable, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { contracts } from './contracts';

export const sharedContracts = pgTable(
  'shared_contracts',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    contractId: varchar('contract_id', { length: 36 })
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),

    accessType: text('access_type').notNull().default('signatory'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_shared_contracts_user').on(table.userId),
    contractIdx: index('idx_shared_contracts_contract').on(table.contractId),
    uniqueAccess: unique('unique_user_contract').on(table.userId, table.contractId),
  })
);

export const sharedContractsRelations = relations(sharedContracts, ({ one }) => ({
  user: one(users, {
    fields: [sharedContracts.userId],
    references: [users.id],
  }),
  contract: one(contracts, {
    fields: [sharedContracts.contractId],
    references: [contracts.id],
  }),
}));

export type SharedContract = typeof sharedContracts.$inferSelect;
export type NewSharedContract = typeof sharedContracts.$inferInsert;
```

#### Download Endpoint

```typescript
// server/routes/contracts.ts (additions)
import { readSignedPdf, signedPdfExists } from '../services/signedPdfStorage';
import { sharedContracts } from '../db/schema/sharedContracts';

// GET /api/contracts/:id/signed-pdf
router.get('/:id/signed-pdf', requireAuth, async (req, res) => {
  try {
    const contractId = req.params.id;

    // Get contract
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, contractId),
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Check access: owner or shared access
    const isOwner = contract.userId === req.session.userId;

    let hasSharedAccess = false;
    if (!isOwner) {
      const shared = await db.query.sharedContracts.findFirst({
        where: and(
          eq(sharedContracts.contractId, contractId),
          eq(sharedContracts.userId, req.session.userId)
        ),
      });
      hasSharedAccess = !!shared;
    }

    if (!isOwner && !hasSharedAccess) {
      return res.status(403).json({ error: 'Not authorized to access this contract' });
    }

    // Check if signed PDF exists
    if (!contract.signedPdfPath) {
      return res.status(404).json({ error: 'Signed PDF not available' });
    }

    const exists = await signedPdfExists(contract.signedPdfPath);
    if (!exists) {
      return res.status(404).json({ error: 'Signed PDF file not found' });
    }

    // Read and send PDF
    const pdfBuffer = await readSignedPdf(contract.signedPdfPath);

    // Generate safe filename
    const safeTitle = contract.title
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50);
    const filename = `${safeTitle}_signed.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log(`[CONTRACTS] Signed PDF downloaded: ${contractId} by user ${req.session.userId}`);
  } catch (error) {
    console.error('[CONTRACTS] Error downloading signed PDF:', error);
    res.status(500).json({ error: 'Failed to download signed PDF' });
  }
});

// GET /api/contracts/:id/signed-pdf/preview (inline display)
router.get('/:id/signed-pdf/preview', requireAuth, async (req, res) => {
  // Same as above but with Content-Disposition: inline
  // ... similar implementation
  res.setHeader('Content-Disposition', 'inline');
  // ...
});
```

#### Add Shared Access Function

```typescript
// server/services/sharedAccess.ts
import { db } from '../db';
import { sharedContracts } from '../db/schema/sharedContracts';
import { eq, and } from 'drizzle-orm';

/**
 * Grant a user shared access to a contract
 */
export async function grantSharedAccess(
  userId: string,
  contractId: string,
  accessType: string = 'signatory'
): Promise<void> {
  try {
    await db
      .insert(sharedContracts)
      .values({
        userId,
        contractId,
        accessType,
      })
      .onConflictDoNothing(); // Ignore if already exists

    console.log(`[SHARED] Access granted: user ${userId} -> contract ${contractId}`);
  } catch (error) {
    console.error('[SHARED] Error granting access:', error);
    throw error;
  }
}

/**
 * Revoke shared access
 */
export async function revokeSharedAccess(
  userId: string,
  contractId: string
): Promise<void> {
  await db
    .delete(sharedContracts)
    .where(
      and(
        eq(sharedContracts.userId, userId),
        eq(sharedContracts.contractId, contractId)
      )
    );

  console.log(`[SHARED] Access revoked: user ${userId} -> contract ${contractId}`);
}

/**
 * Check if user has shared access
 */
export async function hasSharedAccess(
  userId: string,
  contractId: string
): Promise<boolean> {
  const access = await db.query.sharedContracts.findFirst({
    where: and(
      eq(sharedContracts.userId, userId),
      eq(sharedContracts.contractId, contractId)
    ),
  });

  return !!access;
}

/**
 * Get all shared contracts for a user
 */
export async function getSharedContracts(userId: string) {
  return db.query.sharedContracts.findMany({
    where: eq(sharedContracts.userId, userId),
    with: {
      contract: true,
    },
  });
}
```

#### Update Webhook Handler

```typescript
// In server/routes/webhooks.ts, update handleDocumentCompleted:

import { grantSharedAccess } from '../services/sharedAccess';

async function handleDocumentCompleted(data: DocumentCompletedPayload) {
  // ... existing code to find request and download PDF ...

  // Add signed contract to registered signatories' accounts
  for (const signatory of request.signatories) {
    if (signatory.userId && signatory.userId !== request.initiatorId) {
      await grantSharedAccess(signatory.userId, request.contractId, 'signatory');
    }
  }

  // ... rest of function ...
}
```

#### Update User's Contracts List

```typescript
// server/routes/contracts.ts - update list endpoint

// GET /api/contracts - List user's contracts INCLUDING shared
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get owned contracts
    const owned = await db.query.contracts.findMany({
      where: eq(contracts.userId, req.session.userId),
      orderBy: desc(contracts.updatedAt),
    });

    // Get shared contracts
    const shared = await db.query.sharedContracts.findMany({
      where: eq(sharedContracts.userId, req.session.userId),
      with: {
        contract: true,
      },
    });

    // Combine and mark ownership
    const allContracts = [
      ...owned.map(c => ({ ...c, isOwner: true })),
      ...shared.map(s => ({ ...s.contract, isOwner: false, sharedAccess: s.accessType })),
    ];

    // Sort by updated date
    allContracts.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    res.json({ contracts: allContracts });
  } catch (error) {
    console.error('[CONTRACTS] Error listing:', error);
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});
```

### Environment Variables

```bash
# Storage configuration
SIGNED_PDF_STORAGE_DIR=./uploads/signed
```

## Definition of Done

- [ ] Signed PDF downloaded from DocuSeal
- [ ] PDF stored in Aermuse storage
- [ ] Contract signedPdfPath field updated
- [ ] Contract status set to "signed"
- [ ] Download endpoint working for initiator
- [ ] Shared access granted to registered signatories
- [ ] Shared contracts visible in user's list
- [ ] Authorization checks on download
- [ ] Error handling for storage failures

## Testing Checklist

### Unit Tests

- [ ] storeSignedPdf validates buffer
- [ ] readSignedPdf path validation
- [ ] grantSharedAccess idempotent
- [ ] hasSharedAccess returns correct value

### Integration Tests

- [ ] Full flow: webhook → storage → access
- [ ] Download endpoint authorization
- [ ] Shared contracts appear in list

### E2E Tests

- [ ] Sign contract → PDF available
- [ ] Download signed PDF
- [ ] Signatory can access shared contract
- [ ] Non-authorized user cannot download

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.5: Webhook Handler](./4-5-webhook-handler.md)
- [Story 4.6: Email Notifications](./4-6-email-notifications.md)
