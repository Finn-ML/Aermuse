# Epic 4: E-Signing System - Technical Specification

## Overview

This specification details the integration with the DocuSeal e-signing API to provide complete signature workflow capabilities. Rather than building signing infrastructure from scratch, Aermuse leverages DocuSeal for document storage, signature capture, and PDF generation while maintaining local records for tracking and user experience.

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AERMUSE PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Frontend   │───▶│  Aermuse API │───▶│   DocuSeal   │                   │
│  │              │    │              │    │   Service    │                   │
│  │ - Signer UI  │    │ - Routes     │    │              │                   │
│  │ - Status     │    │ - Business   │    │ - Upload     │                   │
│  │ - Dashboard  │    │   Logic      │    │ - Requests   │                   │
│  └──────────────┘    └──────────────┘    │ - Download   │                   │
│                             │            └──────┬───────┘                   │
│                             │                   │                           │
│                             ▼                   ▼                           │
│                      ┌──────────────┐    ┌──────────────┐                   │
│                      │   Database   │    │   DocuSeal   │                   │
│                      │              │    │     API      │                   │
│                      │ - Requests   │    │              │                   │
│                      │ - Signatories│◀───│  (Webhooks)  │                   │
│                      │ - Audit      │    │              │                   │
│                      └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DocuSeal API Reference

**Base URL:** `https://docu-seal-host--finn107.replit.app/api`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/documents` | POST | Upload PDF document |
| `/api/documents/:id` | GET | Get document with signature requests |
| `/api/documents/:id/download` | GET | Download signed PDF |
| `/api/signature-requests` | POST | Create single signature request |
| `/api/signature-requests/batch` | POST | Create multi-signer request |
| `/api/signature-requests/:id` | GET | Get request status |
| `/api/webhooks` | POST | Register webhook |
| `/api/webhooks` | GET | List webhooks |

### Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `signature.completed` | Signer completes | Update signatory status |
| `signature.next_signer_ready` | Sequential: next up | Send email notification |
| `document.completed` | All signers done | Download PDF, update contract |

## Database Schema

### Tables

```sql
-- Signature requests (local tracking)
CREATE TABLE signature_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  initiator_id VARCHAR(36) NOT NULL REFERENCES users(id),

  -- DocuSeal references
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

-- Signatories (individual signers)
CREATE TABLE signatories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id VARCHAR(36) NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,

  -- DocuSeal references
  docuseal_request_id VARCHAR(100),
  signing_token VARCHAR(100),
  signing_url TEXT,

  -- Signer info
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id VARCHAR(36) REFERENCES users(id),

  -- Signing order (1-based)
  signing_order INTEGER NOT NULL DEFAULT 1,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'waiting',
  signed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signature_requests_contract ON signature_requests(contract_id);
CREATE INDEX idx_signature_requests_initiator ON signature_requests(initiator_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signatories_request ON signatories(signature_request_id);
CREATE INDEX idx_signatories_user ON signatories(user_id);
CREATE INDEX idx_signatories_email ON signatories(email);
CREATE INDEX idx_signatories_docuseal ON signatories(docuseal_request_id);
```

### Drizzle Schema

```typescript
// server/db/schema/signatures.ts
import { pgTable, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { contracts } from './contracts';

export const signatureRequests = pgTable('signature_requests', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar('contract_id', { length: 36 }).notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  initiatorId: varchar('initiator_id', { length: 36 }).notNull().references(() => users.id),

  // DocuSeal
  docusealDocumentId: varchar('docuseal_document_id', { length: 100 }),

  // Config
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
}, (table) => ({
  contractIdx: index('idx_signature_requests_contract').on(table.contractId),
  initiatorIdx: index('idx_signature_requests_initiator').on(table.initiatorId),
  statusIdx: index('idx_signature_requests_status').on(table.status),
}));

export const signatories = pgTable('signatories', {
  id: varchar('id', { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  signatureRequestId: varchar('signature_request_id', { length: 36 }).notNull().references(() => signatureRequests.id, { onDelete: 'cascade' }),

  // DocuSeal
  docusealRequestId: varchar('docuseal_request_id', { length: 100 }),
  signingToken: varchar('signing_token', { length: 100 }),
  signingUrl: text('signing_url'),

  // Signer info
  email: text('email').notNull(),
  name: text('name').notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),

  // Order & status
  signingOrder: integer('signing_order').notNull().default(1),
  status: text('status').notNull().default('waiting'),
  signedAt: timestamp('signed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  requestIdx: index('idx_signatories_request').on(table.signatureRequestId),
  userIdx: index('idx_signatories_user').on(table.userId),
  emailIdx: index('idx_signatories_email').on(table.email),
  docusealIdx: index('idx_signatories_docuseal').on(table.docusealRequestId),
}));

// Types
export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type NewSignatureRequest = typeof signatureRequests.$inferInsert;
export type Signatory = typeof signatories.$inferSelect;
export type NewSignatory = typeof signatories.$inferInsert;
```

### Status Values

**Signature Request Status:**
- `pending` - Created, waiting for signatures
- `in_progress` - At least one signature collected
- `completed` - All signatures collected
- `expired` - Passed expiration date
- `cancelled` - Cancelled by initiator

**Signatory Status:**
- `waiting` - Sequential: waiting for previous signers
- `pending` - Ready to sign
- `signed` - Signature completed

## DocuSeal Service

### Service Implementation

```typescript
// server/services/docuseal.ts
import crypto from 'crypto';

const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_BASE_URL || 'https://docu-seal-host--finn107.replit.app/api';
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY;

// Types
export interface DocuSealDocument {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
}

export interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateSignatureRequest {
  documentId: string;
  signerName: string;
  signerEmail: string;
  signaturePosition?: SignaturePosition;
  signingOrder?: number;
  expiresAt?: string;
}

export interface BatchSigner {
  signerName: string;
  signerEmail: string;
  signingOrder: number;
  signaturePosition?: SignaturePosition;
}

export interface CreateBatchRequest {
  documentId: string;
  signers: BatchSigner[];
  expiresAt?: string;
}

export interface SignatureRequestResponse {
  id: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signingToken: string;
  signingUrl: string;
  signingOrder: number;
  status: string;
  createdAt: string;
}

export interface BatchSignatureResponse {
  documentId: string;
  totalSigners: number;
  signatureRequests: SignatureRequestResponse[];
}

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

class DocuSealService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = DOCUSEAL_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`DocuSeal API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Document operations
  async uploadDocument(pdfBuffer: Buffer, filename: string): Promise<DocuSealDocument> {
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload document: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocument(documentId: string): Promise<DocuSealDocument & { signatureRequests: SignatureRequestResponse[] }> {
    return this.request(`/documents/${documentId}`);
  }

  async downloadSignedDocument(documentId: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/download`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Signature request operations
  async createSignatureRequest(request: CreateSignatureRequest): Promise<SignatureRequestResponse> {
    return this.request('/signature-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async createBatchSignatureRequests(request: CreateBatchRequest): Promise<BatchSignatureResponse> {
    return this.request('/signature-requests/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSignatureRequest(requestId: string): Promise<SignatureRequestResponse> {
    return this.request(`/signature-requests/${requestId}`);
  }

  // Webhook operations
  async registerWebhook(url: string, events: string[]): Promise<WebhookRegistration> {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    });
  }

  async listWebhooks(): Promise<WebhookRegistration[]> {
    return this.request('/webhooks');
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/webhooks/${webhookId}`, { method: 'DELETE' });
  }
}

// Singleton instance
export const docuseal = new DocuSealService(DOCUSEAL_API_KEY!);

// Webhook verification
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
```

## API Endpoints

### Signature Request Routes

```typescript
// server/routes/signatures.ts
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { signatureRequests, signatories } from '../db/schema/signatures';
import { contracts } from '../db/schema/contracts';
import { docuseal } from '../services/docuseal';
import { generateContractPDF } from '../services/pdfGenerator';
import { sendSigningRequestEmail, sendSigningReminderEmail } from '../services/email';
import { eq, and, desc } from 'drizzle-orm';

const router = express.Router();

// Create signature request
router.post('/request', requireAuth, async (req, res) => {
  const { contractId, signatories: signerList, message, expiresAt } = req.body;

  // Validate
  if (!contractId || !signerList || signerList.length === 0) {
    return res.status(400).json({ error: 'Contract ID and signatories required' });
  }

  if (signerList.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 signatories allowed' });
  }

  // Get contract
  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
  });

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  if (contract.userId !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    // 1. Generate PDF from contract
    const pdfBuffer = await generateContractPDF(contract);

    // 2. Upload to DocuSeal
    const docusealDoc = await docuseal.uploadDocument(
      pdfBuffer,
      `${contract.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
    );

    // 3. Create batch signature requests
    const batchResponse = await docuseal.createBatchSignatureRequests({
      documentId: docusealDoc.id,
      signers: signerList.map((s: any, i: number) => ({
        signerName: s.name,
        signerEmail: s.email,
        signingOrder: i + 1,
      })),
      expiresAt: expiresAt || undefined,
    });

    // 4. Create local signature request record
    const [signatureRequest] = await db.insert(signatureRequests)
      .values({
        contractId,
        initiatorId: req.session.userId,
        docusealDocumentId: docusealDoc.id,
        status: 'pending',
        signingOrder: 'sequential',
        message,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      })
      .returning();

    // 5. Create signatory records
    const signatoryRecords = await Promise.all(
      batchResponse.signatureRequests.map(async (sr, index) => {
        const signer = signerList[index];

        // Check if signer is a registered user
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, signer.email),
        });

        const [signatory] = await db.insert(signatories)
          .values({
            signatureRequestId: signatureRequest.id,
            docusealRequestId: sr.id,
            signingToken: sr.signingToken,
            signingUrl: sr.signingUrl,
            email: signer.email,
            name: signer.name,
            userId: existingUser?.id || null,
            signingOrder: sr.signingOrder,
            status: sr.status, // 'pending' for first, 'waiting' for rest
          })
          .returning();

        return signatory;
      })
    );

    // 6. Send email to first signer (or all if parallel)
    const firstSigner = signatoryRecords[0];
    await sendSigningRequestEmail({
      to: firstSigner.email,
      signerName: firstSigner.name,
      contractTitle: contract.title,
      initiatorName: req.session.userName,
      message,
      signingUrl: firstSigner.signingUrl!,
    });

    console.log(`[SIGNATURES] Request created: ${signatureRequest.id} for contract ${contractId}`);

    res.json({
      signatureRequest: {
        ...signatureRequest,
        signatories: signatoryRecords,
      },
    });
  } catch (error) {
    console.error('[SIGNATURES] Error creating request:', error);
    res.status(500).json({ error: 'Failed to create signature request' });
  }
});

// Get signature request status
router.get('/:id', requireAuth, async (req, res) => {
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, req.params.id),
    with: {
      signatories: {
        orderBy: signatories.signingOrder,
      },
      contract: true,
    },
  });

  if (!request) {
    return res.status(404).json({ error: 'Signature request not found' });
  }

  // Check access: initiator or signatory
  const isInitiator = request.initiatorId === req.session.userId;
  const isSignatory = request.signatories.some(s => s.userId === req.session.userId);

  if (!isInitiator && !isSignatory) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  res.json({ signatureRequest: request });
});

// List pending requests (as initiator)
router.get('/pending', requireAuth, async (req, res) => {
  const requests = await db.query.signatureRequests.findMany({
    where: and(
      eq(signatureRequests.initiatorId, req.session.userId),
      eq(signatureRequests.status, 'pending')
    ),
    with: {
      signatories: true,
      contract: true,
    },
    orderBy: desc(signatureRequests.createdAt),
  });

  res.json({ signatureRequests: requests });
});

// List requests to sign (as signatory)
router.get('/to-sign', requireAuth, async (req, res) => {
  const userSignatories = await db.query.signatories.findMany({
    where: and(
      eq(signatories.userId, req.session.userId),
      eq(signatories.status, 'pending')
    ),
    with: {
      signatureRequest: {
        with: {
          contract: true,
          initiator: true,
        },
      },
    },
  });

  res.json({
    toSign: userSignatories.map(s => ({
      ...s.signatureRequest,
      signingUrl: s.signingUrl,
    })),
  });
});

// Cancel signature request
router.delete('/:id', requireAuth, async (req, res) => {
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, req.params.id),
  });

  if (!request) {
    return res.status(404).json({ error: 'Signature request not found' });
  }

  if (request.initiatorId !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (request.status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel completed request' });
  }

  await db.update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(signatureRequests.id, req.params.id));

  // TODO: Notify signatories of cancellation

  res.json({ success: true });
});

// Send reminder
router.post('/:id/remind', requireAuth, async (req, res) => {
  const { signatoryId } = req.body;

  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, req.params.id),
    with: {
      signatories: true,
      contract: true,
    },
  });

  if (!request) {
    return res.status(404).json({ error: 'Signature request not found' });
  }

  if (request.initiatorId !== req.session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const signatory = request.signatories.find(s => s.id === signatoryId);
  if (!signatory || signatory.status !== 'pending') {
    return res.status(400).json({ error: 'Invalid signatory or already signed' });
  }

  await sendSigningReminderEmail({
    to: signatory.email,
    signerName: signatory.name,
    contractTitle: request.contract.title,
    initiatorName: req.session.userName,
    signingUrl: signatory.signingUrl!,
  });

  res.json({ success: true });
});

export default router;
```

### Webhook Handler

```typescript
// server/routes/webhooks.ts
import express from 'express';
import { db } from '../db';
import { signatureRequests, signatories } from '../db/schema/signatures';
import { contracts } from '../db/schema/contracts';
import { docuseal, verifyWebhookSignature } from '../services/docuseal';
import { sendSignatureConfirmedEmail, sendDocumentCompletedEmail, sendSigningRequestEmail } from '../services/email';
import { eq } from 'drizzle-orm';

const router = express.Router();
const WEBHOOK_SECRET = process.env.DOCUSEAL_WEBHOOK_SECRET!;

router.post('/docuseal', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const event = req.headers['x-webhook-event'] as string;
  const payload = req.body.toString();

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    console.error('[WEBHOOK] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const data = JSON.parse(payload);
  console.log(`[WEBHOOK] Received: ${event}`, data);

  try {
    switch (event) {
      case 'signature.completed':
        await handleSignatureCompleted(data);
        break;
      case 'signature.next_signer_ready':
        await handleNextSignerReady(data);
        break;
      case 'document.completed':
        await handleDocumentCompleted(data);
        break;
      default:
        console.log(`[WEBHOOK] Unhandled event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error handling event:', error);
    res.status(500).json({ error: 'Webhook handler error' });
  }
});

async function handleSignatureCompleted(data: {
  signatureRequestId: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  completedAt: string;
}) {
  // Update signatory status
  const [signatory] = await db.update(signatories)
    .set({
      status: 'signed',
      signedAt: new Date(data.completedAt),
    })
    .where(eq(signatories.docusealRequestId, data.signatureRequestId))
    .returning();

  if (!signatory) {
    console.error('[WEBHOOK] Signatory not found:', data.signatureRequestId);
    return;
  }

  // Update request status to in_progress if first signature
  await db.update(signatureRequests)
    .set({ status: 'in_progress', updatedAt: new Date() })
    .where(eq(signatureRequests.id, signatory.signatureRequestId));

  // Send confirmation email
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, signatory.signatureRequestId),
    with: { contract: true },
  });

  if (request) {
    await sendSignatureConfirmedEmail({
      to: signatory.email,
      signerName: signatory.name,
      contractTitle: request.contract.title,
    });
  }

  console.log(`[WEBHOOK] Signature completed: ${signatory.email} for request ${signatory.signatureRequestId}`);
}

async function handleNextSignerReady(data: {
  signatureRequestId: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signingOrder: number;
}) {
  // Update signatory status to pending
  const [signatory] = await db.update(signatories)
    .set({ status: 'pending' })
    .where(eq(signatories.docusealRequestId, data.signatureRequestId))
    .returning();

  if (!signatory) {
    console.error('[WEBHOOK] Next signer not found:', data.signatureRequestId);
    return;
  }

  // Get request details for email
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, signatory.signatureRequestId),
    with: {
      contract: true,
      initiator: true,
    },
  });

  if (request) {
    await sendSigningRequestEmail({
      to: signatory.email,
      signerName: signatory.name,
      contractTitle: request.contract.title,
      initiatorName: request.initiator.name,
      message: request.message || undefined,
      signingUrl: signatory.signingUrl!,
    });
  }

  console.log(`[WEBHOOK] Next signer ready: ${signatory.email} (order ${data.signingOrder})`);
}

async function handleDocumentCompleted(data: {
  documentId: string;
  totalSigners: number;
  completedAt: string;
}) {
  // Find request by DocuSeal document ID
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.docusealDocumentId, data.documentId),
    with: {
      contract: true,
      signatories: true,
      initiator: true,
    },
  });

  if (!request) {
    console.error('[WEBHOOK] Request not found for document:', data.documentId);
    return;
  }

  try {
    // Download signed PDF
    const signedPdf = await docuseal.downloadSignedDocument(data.documentId);

    // Store signed PDF (implementation depends on your storage)
    const signedPdfPath = await storeSignedPdf(signedPdf, request.contract.id);

    // Update request status
    await db.update(signatureRequests)
      .set({
        status: 'completed',
        completedAt: new Date(data.completedAt),
        signedPdfPath,
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, request.id));

    // Update contract status
    await db.update(contracts)
      .set({ status: 'signed', updatedAt: new Date() })
      .where(eq(contracts.id, request.contractId));

    // Send completion emails to all parties
    const allParties = [
      { email: request.initiator.email, name: request.initiator.name },
      ...request.signatories.map(s => ({ email: s.email, name: s.name })),
    ];

    for (const party of allParties) {
      await sendDocumentCompletedEmail({
        to: party.email,
        recipientName: party.name,
        contractTitle: request.contract.title,
        downloadUrl: `/api/contracts/${request.contractId}/signed-pdf`,
      });
    }

    // Add contract to registered signatories' accounts
    for (const signatory of request.signatories) {
      if (signatory.userId) {
        // Create a shared contract reference for registered users
        // This could be a separate table or a flag on contracts
        await createSharedContractReference(signatory.userId, request.contractId);
      }
    }

    console.log(`[WEBHOOK] Document completed: ${request.id}, PDF stored at ${signedPdfPath}`);
  } catch (error) {
    console.error('[WEBHOOK] Error processing completed document:', error);
  }
}

// Helper functions (implement based on your storage solution)
async function storeSignedPdf(pdfBuffer: Buffer, contractId: string): Promise<string> {
  // Store in file system or cloud storage
  const filename = `signed_${contractId}_${Date.now()}.pdf`;
  // ... storage implementation
  return `/uploads/signed/${filename}`;
}

async function createSharedContractReference(userId: string, contractId: string): Promise<void> {
  // Create reference for user to access signed contract
  // ... implementation
}

export default router;
```

## Email Templates

### Required Templates

1. **signing-request** - Initial request to sign
2. **signing-reminder** - Reminder for pending signature
3. **signature-confirmed** - Confirmation after signing
4. **document-completed** - All signatures complete, includes download link
5. **request-cancelled** - Notification of cancellation

### Template Structure

```typescript
// server/services/email/templates.ts
export const signingRequestTemplate = {
  subject: 'Signature requested: {{contractTitle}}',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #722F37; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Aermuse</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2>Hello {{signerName}},</h2>
        <p>{{initiatorName}} has requested your signature on:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">{{contractTitle}}</h3>
          {{#if message}}
          <p style="color: #666; font-style: italic;">"{{message}}"</p>
          {{/if}}
        </div>
        <a href="{{signingUrl}}" style="display: inline-block; background: #722F37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Sign Now
        </a>
        <p style="color: #666; margin-top: 30px; font-size: 14px;">
          This signing request expires on {{expiresAt}}.
        </p>
      </div>
    </div>
  `,
};
```

## Frontend Components

### Key Components

1. **AddSignatoriesModal** - Add/remove signers, set order
2. **SignatureStatusTracker** - Visual progress of signing
3. **AwaitingSignatureList** - Dashboard section for pending signatures
4. **SigningUrlCopy** - Copy signing URL button

### Types

```typescript
// client/src/types/signatures.ts
export interface SignatureRequest {
  id: string;
  contractId: string;
  initiatorId: string;
  docusealDocumentId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  signingOrder: 'sequential' | 'parallel';
  message: string | null;
  expiresAt: string;
  completedAt: string | null;
  signedPdfPath: string | null;
  createdAt: string;
  updatedAt: string;
  signatories: Signatory[];
  contract?: Contract;
}

export interface Signatory {
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

export interface CreateSignatureRequestInput {
  contractId: string;
  signatories: {
    name: string;
    email: string;
  }[];
  message?: string;
  expiresAt?: string;
}
```

## Environment Variables

```bash
# DocuSeal Integration
DOCUSEAL_API_KEY=sk_live_your_api_key_here
DOCUSEAL_BASE_URL=https://docu-seal-host--finn107.replit.app/api
DOCUSEAL_WEBHOOK_SECRET=whsec_your_webhook_secret

# Webhook URL (for registration)
APP_BASE_URL=https://your-aermuse-domain.com
```

## Testing Strategy

### Unit Tests
- DocuSeal service methods
- Webhook signature verification
- Status transitions

### Integration Tests
- Create signature request flow
- Webhook event handling
- PDF download and storage

### E2E Tests
- Full signing workflow (mock DocuSeal responses)
- Dashboard pending signatures
- Email notifications

## Security Considerations

1. **Webhook Verification** - Always verify HMAC signature
2. **Token Security** - Don't expose signing tokens in logs
3. **Access Control** - Only initiator/signatories can view request
4. **Rate Limiting** - Limit reminder emails
5. **Expiration** - Handle expired requests gracefully
