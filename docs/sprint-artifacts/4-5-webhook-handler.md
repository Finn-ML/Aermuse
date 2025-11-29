# Story 4.5: Webhook Handler

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.5 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Webhook Handler |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to receive DocuSeal webhook events
**So that** signing status updates in real-time

## Context

DocuSeal sends webhook events when signatures are completed and when documents are fully signed. This story implements the webhook endpoint that receives these events, updates local database records, triggers email notifications, and downloads signed PDFs.

**Dependencies:**
- Story 4.1 (DocuSeal Integration Service) for signature verification
- Story 4.2 (Data Model) for database updates
- Story 4.6 (Email Notifications) for sending emails

## Acceptance Criteria

- [ ] **AC-1:** `POST /api/webhooks/docuseal` endpoint created
- [ ] **AC-2:** Verify webhook signature using HMAC-SHA256
- [ ] **AC-3:** Handle `signature.completed` - update signatory status
- [ ] **AC-4:** Handle `signature.next_signer_ready` - notify next signer
- [ ] **AC-5:** Handle `document.completed` - download signed PDF, update contract
- [ ] **AC-6:** Store signed PDF in Aermuse storage
- [ ] **AC-7:** Update contract status to "signed"
- [ ] **AC-8:** Trigger email notifications to all parties
- [ ] **AC-9:** Idempotent handling (duplicate events)
- [ ] **AC-10:** Error logging and monitoring

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/webhooks.ts` | New: Webhook handler |
| `server/routes/index.ts` | Register webhooks router |
| `server/services/signedPdfStorage.ts` | New: Store signed PDFs |

### Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `signature.completed` | Signer completes | Update signatory status, notify initiator |
| `signature.next_signer_ready` | Sequential: next up | Send email to next signer |
| `document.completed` | All signers done | Download PDF, update contract, notify all |

### Implementation

```typescript
// server/routes/webhooks.ts
import express from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { signatureRequests, signatories } from '../db/schema/signatures';
import { contracts } from '../db/schema/contracts';
import { users } from '../db/schema/users';
import { DocuSealService, docuseal } from '../services/docuseal';
import { storeSignedPdf } from '../services/signedPdfStorage';
import {
  sendSignatureConfirmedEmail,
  sendSignatureNotificationToInitiator,
  sendSigningRequestEmail,
  sendDocumentCompletedEmail,
} from '../services/email';

const router = express.Router();

const WEBHOOK_SECRET = process.env.DOCUSEAL_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn('[WEBHOOK] DOCUSEAL_WEBHOOK_SECRET not set - webhooks will fail verification');
}

// ============================================
// WEBHOOK TYPES
// ============================================

interface SignatureCompletedPayload {
  event: 'signature.completed';
  signatureRequestId: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signingOrder: number;
  completedAt: string;
}

interface NextSignerReadyPayload {
  event: 'signature.next_signer_ready';
  signatureRequestId: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signingOrder: number;
}

interface DocumentCompletedPayload {
  event: 'document.completed';
  documentId: string;
  totalSigners: number;
  completedAt: string;
}

type WebhookPayload = SignatureCompletedPayload | NextSignerReadyPayload | DocumentCompletedPayload;

// ============================================
// WEBHOOK ENDPOINT
// ============================================

// Use raw body for signature verification
router.post(
  '/docuseal',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const event = req.headers['x-webhook-event'] as string;

    // Get raw payload for verification
    const payload = req.body.toString();

    // Verify signature
    if (!WEBHOOK_SECRET) {
      console.error('[WEBHOOK] No webhook secret configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!signature || !DocuSealService.verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('[WEBHOOK] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse payload
    let data: WebhookPayload;
    try {
      data = JSON.parse(payload);
    } catch (error) {
      console.error('[WEBHOOK] Invalid JSON payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log(`[WEBHOOK] Received: ${event}`, {
      documentId: 'documentId' in data ? data.documentId : undefined,
      requestId: 'signatureRequestId' in data ? data.signatureRequestId : undefined,
    });

    try {
      switch (event) {
        case 'signature.completed':
          await handleSignatureCompleted(data as SignatureCompletedPayload);
          break;

        case 'signature.next_signer_ready':
          await handleNextSignerReady(data as NextSignerReadyPayload);
          break;

        case 'document.completed':
          await handleDocumentCompleted(data as DocumentCompletedPayload);
          break;

        default:
          console.log(`[WEBHOOK] Unhandled event: ${event}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error(`[WEBHOOK] Error handling ${event}:`, error);
      // Return 200 to prevent retries for application errors
      // DocuSeal will retry on 4xx/5xx
      res.status(200).json({ received: true, error: 'Handler error' });
    }
  }
);

// ============================================
// EVENT HANDLERS
// ============================================

async function handleSignatureCompleted(data: SignatureCompletedPayload) {
  console.log(`[WEBHOOK] Processing signature.completed for ${data.signerEmail}`);

  // Find signatory by DocuSeal request ID
  const [signatory] = await db
    .update(signatories)
    .set({
      status: 'signed',
      signedAt: new Date(data.completedAt),
    })
    .where(eq(signatories.docusealRequestId, data.signatureRequestId))
    .returning();

  if (!signatory) {
    console.error(`[WEBHOOK] Signatory not found: ${data.signatureRequestId}`);
    return;
  }

  // Check if this was already processed (idempotency)
  if (signatory.signedAt && signatory.status === 'signed') {
    console.log(`[WEBHOOK] Signature already processed: ${data.signatureRequestId}`);
    return;
  }

  // Get request details
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.id, signatory.signatureRequestId),
    with: {
      contract: true,
      initiator: true,
      signatories: true,
    },
  });

  if (!request) {
    console.error(`[WEBHOOK] Request not found for signatory: ${signatory.id}`);
    return;
  }

  // Update request status to in_progress if first signature
  if (request.status === 'pending') {
    await db
      .update(signatureRequests)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(signatureRequests.id, request.id));
  }

  // Send confirmation to signer
  await sendSignatureConfirmedEmail({
    to: signatory.email,
    signerName: signatory.name,
    contractTitle: request.contract.title,
  });

  // Notify initiator
  const signedCount = request.signatories.filter(s => s.status === 'signed').length + 1;
  const totalCount = request.signatories.length;

  await sendSignatureNotificationToInitiator({
    to: request.initiator.email,
    initiatorName: request.initiator.name,
    signerName: signatory.name,
    contractTitle: request.contract.title,
    signedCount,
    totalCount,
  });

  console.log(`[WEBHOOK] Signature completed: ${signatory.email} (${signedCount}/${totalCount})`);
}

async function handleNextSignerReady(data: NextSignerReadyPayload) {
  console.log(`[WEBHOOK] Processing next_signer_ready for ${data.signerEmail}`);

  // Update signatory status to pending
  const [signatory] = await db
    .update(signatories)
    .set({ status: 'pending' })
    .where(eq(signatories.docusealRequestId, data.signatureRequestId))
    .returning();

  if (!signatory) {
    console.error(`[WEBHOOK] Next signer not found: ${data.signatureRequestId}`);
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

  if (!request) {
    console.error(`[WEBHOOK] Request not found: ${signatory.signatureRequestId}`);
    return;
  }

  // Send signing request email
  await sendSigningRequestEmail({
    to: signatory.email,
    signerName: signatory.name,
    contractTitle: request.contract.title,
    initiatorName: request.initiator.name,
    message: request.message || undefined,
    signingUrl: signatory.signingUrl!,
    expiresAt: request.expiresAt?.toISOString(),
  });

  console.log(`[WEBHOOK] Next signer notified: ${signatory.email} (order ${data.signingOrder})`);
}

async function handleDocumentCompleted(data: DocumentCompletedPayload) {
  console.log(`[WEBHOOK] Processing document.completed for ${data.documentId}`);

  // Find request by DocuSeal document ID
  const request = await db.query.signatureRequests.findFirst({
    where: eq(signatureRequests.docusealDocumentId, data.documentId),
    with: {
      contract: true,
      initiator: true,
      signatories: true,
    },
  });

  if (!request) {
    console.error(`[WEBHOOK] Request not found for document: ${data.documentId}`);
    return;
  }

  // Check if already processed (idempotency)
  if (request.status === 'completed') {
    console.log(`[WEBHOOK] Document already completed: ${data.documentId}`);
    return;
  }

  try {
    // Download signed PDF from DocuSeal
    console.log(`[WEBHOOK] Downloading signed PDF`);
    const signedPdf = await docuseal.service.downloadSignedDocument(data.documentId);

    // Store signed PDF
    const signedPdfPath = await storeSignedPdf(
      signedPdf,
      request.contractId,
      request.contract.title
    );

    // Update request status
    await db
      .update(signatureRequests)
      .set({
        status: 'completed',
        completedAt: new Date(data.completedAt),
        signedPdfPath,
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, request.id));

    // Update all signatories to signed (in case webhook order was different)
    await db
      .update(signatories)
      .set({ status: 'signed' })
      .where(eq(signatories.signatureRequestId, request.id));

    // Update contract status
    await db
      .update(contracts)
      .set({
        status: 'signed',
        signedPdfPath,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, request.contractId));

    // Send completion emails to all parties
    const allParties = [
      { email: request.initiator.email, name: request.initiator.name },
      ...request.signatories.map(s => ({ email: s.email, name: s.name })),
    ];

    // Dedupe by email
    const uniqueParties = allParties.filter(
      (party, index, self) =>
        index === self.findIndex(p => p.email === party.email)
    );

    for (const party of uniqueParties) {
      await sendDocumentCompletedEmail({
        to: party.email,
        recipientName: party.name,
        contractTitle: request.contract.title,
        downloadUrl: `/api/contracts/${request.contractId}/signed-pdf`,
      });
    }

    // Add signed contract to registered signatories' accounts
    for (const signatory of request.signatories) {
      if (signatory.userId && signatory.userId !== request.initiatorId) {
        await addSharedContractAccess(signatory.userId, request.contractId);
      }
    }

    console.log(`[WEBHOOK] Document completed: ${request.id}, PDF stored at ${signedPdfPath}`);
  } catch (error) {
    console.error(`[WEBHOOK] Error processing document completion:`, error);
    throw error; // Re-throw to trigger error response
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function addSharedContractAccess(userId: string, contractId: string) {
  // Create a shared contract reference for registered users
  // This allows signatories who have accounts to see the contract in their dashboard
  // Implementation depends on your data model - could be:
  // 1. A separate shared_contracts table
  // 2. A JSONB array on the contract
  // 3. A separate user_contracts junction table

  console.log(`[WEBHOOK] Adding shared access: user ${userId} -> contract ${contractId}`);

  // Example: Insert into shared_contracts table if it exists
  // await db.insert(sharedContracts).values({ userId, contractId }).onConflictDoNothing();
}

export default router;
```

### Signed PDF Storage Service

```typescript
// server/services/signedPdfStorage.ts
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORAGE_DIR = process.env.SIGNED_PDF_STORAGE_DIR || './uploads/signed';

/**
 * Store a signed PDF and return the storage path
 */
export async function storeSignedPdf(
  pdfBuffer: Buffer,
  contractId: string,
  contractTitle: string
): Promise<string> {
  // Ensure storage directory exists
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  // Generate unique filename
  const hash = crypto.randomBytes(8).toString('hex');
  const safeTitle = contractTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const filename = `signed_${safeTitle}_${contractId}_${hash}.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  // Write file
  await fs.writeFile(filepath, pdfBuffer);

  console.log(`[STORAGE] Signed PDF stored: ${filepath} (${pdfBuffer.length} bytes)`);

  return filepath;
}

/**
 * Read a signed PDF by path
 */
export async function readSignedPdf(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}

/**
 * Delete a signed PDF
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
```

### Register Webhook Router

```typescript
// server/routes/index.ts
import webhooksRouter from './webhooks';

// Register BEFORE body parsing middleware for raw body access
// Or configure express.raw() specifically for this route
app.use('/api/webhooks', webhooksRouter);
```

### Webhook Registration Script

```typescript
// scripts/register-webhook.ts
import { docuseal } from '../server/services/docuseal';

const APP_BASE_URL = process.env.APP_BASE_URL;

async function registerWebhook() {
  if (!APP_BASE_URL) {
    console.error('APP_BASE_URL environment variable is required');
    process.exit(1);
  }

  const webhookUrl = `${APP_BASE_URL}/api/webhooks/docuseal`;

  try {
    const registration = await docuseal.service.registerWebhook(webhookUrl, [
      'signature.completed',
      'signature.next_signer_ready',
      'document.completed',
    ]);

    console.log('Webhook registered successfully!');
    console.log('Webhook ID:', registration.id);
    console.log('Webhook URL:', registration.url);
    console.log('Events:', registration.events);
    console.log('\n⚠️  IMPORTANT: Save this webhook secret to your .env file:');
    console.log(`DOCUSEAL_WEBHOOK_SECRET=${registration.secret}`);
  } catch (error) {
    console.error('Failed to register webhook:', error);
    process.exit(1);
  }
}

registerWebhook();
```

### Environment Variables

```bash
# .env
DOCUSEAL_WEBHOOK_SECRET=whsec_your_secret_here
SIGNED_PDF_STORAGE_DIR=./uploads/signed
APP_BASE_URL=https://your-app-domain.com
```

## Definition of Done

- [ ] Webhook endpoint receiving events
- [ ] Signature verification working
- [ ] `signature.completed` updates status and sends emails
- [ ] `signature.next_signer_ready` notifies next signer
- [ ] `document.completed` downloads and stores PDF
- [ ] Contract status updated to "signed"
- [ ] All parties receive completion email
- [ ] Idempotent handling of duplicate events
- [ ] Error logging in place
- [ ] Webhook registration script working

## Testing Checklist

### Unit Tests

```typescript
describe('Webhook Handler', () => {
  describe('signature verification', () => {
    it('rejects invalid signature', async () => {
      const response = await request(app)
        .post('/api/webhooks/docuseal')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', 'sha256=invalid')
        .set('X-Webhook-Event', 'signature.completed')
        .send({ event: 'signature.completed' });

      expect(response.status).toBe(401);
    });

    it('accepts valid signature', async () => {
      const payload = JSON.stringify({ event: 'test' });
      const signature = generateValidSignature(payload);

      const response = await request(app)
        .post('/api/webhooks/docuseal')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .set('X-Webhook-Event', 'test')
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('signature.completed', () => {
    it('updates signatory status', async () => {
      // Create test data
      const signatory = await createTestSignatory();

      // Send webhook
      await sendWebhook('signature.completed', {
        signatureRequestId: signatory.docusealRequestId,
        documentId: 'doc_123',
        signerEmail: signatory.email,
        completedAt: new Date().toISOString(),
      });

      // Verify update
      const updated = await db.query.signatories.findFirst({
        where: eq(signatories.id, signatory.id),
      });

      expect(updated?.status).toBe('signed');
      expect(updated?.signedAt).toBeDefined();
    });
  });

  describe('document.completed', () => {
    it('downloads and stores signed PDF', async () => {
      // Mock DocuSeal download
      jest.spyOn(docuseal.service, 'downloadSignedDocument')
        .mockResolvedValue(Buffer.from('PDF content'));

      // Send webhook
      await sendWebhook('document.completed', {
        documentId: testRequest.docusealDocumentId,
        totalSigners: 2,
        completedAt: new Date().toISOString(),
      });

      // Verify storage
      const updated = await db.query.signatureRequests.findFirst({
        where: eq(signatureRequests.id, testRequest.id),
      });

      expect(updated?.status).toBe('completed');
      expect(updated?.signedPdfPath).toBeDefined();
    });
  });

  describe('idempotency', () => {
    it('handles duplicate events gracefully', async () => {
      // Send same event twice
      await sendWebhook('signature.completed', payload);
      await sendWebhook('signature.completed', payload);

      // Should not fail or duplicate
    });
  });
});
```

### Integration Tests

- [ ] Full webhook flow with mock DocuSeal
- [ ] PDF download and storage
- [ ] Email sending (mock)

### Manual Testing

1. Register webhook with DocuSeal
2. Create signature request
3. Sign document in DocuSeal
4. Verify webhook received
5. Verify status updates
6. Verify PDF stored
7. Verify emails sent

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.1: DocuSeal Integration Service](./4-1-docuseal-integration-service.md)
- [Story 4.6: Email Notifications](./4-6-email-notifications.md)
- [Story 4.9: Signed Document Storage](./4-9-signed-document-storage.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create webhook endpoint with signature verification**
  - [ ] Create `server/routes/webhooks.ts`
  - [ ] Implement POST /api/webhooks/docuseal endpoint
  - [ ] Use express.raw() for signature verification
  - [ ] Verify HMAC-SHA256 signature using webhook secret
  - [ ] Parse and validate webhook payload

- [ ] **Task 2: Implement signature.completed event handler**
  - [ ] Create handleSignatureCompleted function
  - [ ] Update signatory status to 'signed' with timestamp
  - [ ] Update signature request status to 'in_progress' if first signature
  - [ ] Send confirmation email to signer
  - [ ] Send progress notification to initiator
  - [ ] Add idempotency check

- [ ] **Task 3: Implement signature.next_signer_ready event handler**
  - [ ] Create handleNextSignerReady function
  - [ ] Update signatory status from 'waiting' to 'pending'
  - [ ] Send signing request email to next signer
  - [ ] Include message and expiration in email

- [ ] **Task 4: Implement document.completed event handler**
  - [ ] Create handleDocumentCompleted function
  - [ ] Download signed PDF from DocuSeal
  - [ ] Store signed PDF using storage service
  - [ ] Update signature request status to 'completed'
  - [ ] Update contract status to 'signed' with PDF path
  - [ ] Send completion emails to all parties

- [ ] **Task 5: Create signed PDF storage service**
  - [ ] Create `server/services/signedPdfStorage.ts`
  - [ ] Implement storeSignedPdf with unique filename generation
  - [ ] Add readSignedPdf with path validation
  - [ ] Implement deleteSignedPdf for cleanup
  - [ ] Add file size and format validation

- [ ] **Task 6: Grant shared access to registered signatories**
  - [ ] Create shared contract access helper function
  - [ ] Add registered signatories to shared_contracts table
  - [ ] Ensure contract visible in signatory dashboards
  - [ ] Handle duplicate access grants gracefully

- [ ] **Task 7: Create webhook registration script**
  - [ ] Create `scripts/register-webhook.ts`
  - [ ] Register webhook URL with DocuSeal
  - [ ] Subscribe to required events
  - [ ] Display webhook secret for .env configuration
  - [ ] Test webhook with DocuSeal sandbox

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
