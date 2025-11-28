# Story 4.4: Signature Request API

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.4 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Signature Request API |
| **Priority** | P0 - Critical |
| **Story Points** | 5 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** API endpoints for signature requests
**So that** the frontend can manage signing workflows

## Context

This story implements the backend API endpoints that orchestrate the e-signing workflow. The API generates PDFs from contracts, uploads to DocuSeal, creates signature requests, stores local records, and provides status endpoints.

**Dependencies:**
- Story 4.1 (DocuSeal Integration Service)
- Story 4.2 (Data Model)

## Acceptance Criteria

- [ ] **AC-1:** `POST /api/signatures/request` creates signature request
  - Generates PDF from contract
  - Uploads to DocuSeal
  - Creates batch signature requests
  - Stores local records
  - Returns request with signing URLs
- [ ] **AC-2:** `GET /api/signatures/:id` returns request with all signatories
- [ ] **AC-3:** `GET /api/signatures/pending` lists user's pending requests (as initiator)
- [ ] **AC-4:** `GET /api/signatures/to-sign` lists requests where user is a signatory
- [ ] **AC-5:** `DELETE /api/signatures/:id` cancels request (before completion)
- [ ] **AC-6:** `POST /api/signatures/:id/remind` resends signing URL email
- [ ] **AC-7:** Proper authorization checks on all endpoints
- [ ] **AC-8:** Input validation with meaningful error messages

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/signatures.ts` | New: All signature endpoints |
| `server/routes/index.ts` | Register signatures router |
| `server/services/pdfGenerator.ts` | Contract to PDF conversion |

### API Implementation

```typescript
// server/routes/signatures.ts
import express from 'express';
import { z } from 'zod';
import { eq, and, desc, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { signatureRequests, signatories } from '../db/schema/signatures';
import { contracts } from '../db/schema/contracts';
import { users } from '../db/schema/users';
import { docuseal } from '../services/docuseal';
import { generateContractPDF } from '../services/pdfGenerator';
import { sendSigningRequestEmail, sendSigningReminderEmail } from '../services/email';

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createRequestSchema = z.object({
  contractId: z.string().uuid(),
  signatories: z.array(z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email'),
  })).min(1, 'At least one signatory required').max(10, 'Maximum 10 signatories'),
  message: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

const remindSchema = z.object({
  signatoryId: z.string().uuid(),
});

// ============================================
// CREATE SIGNATURE REQUEST
// ============================================

router.post('/request', requireAuth, async (req, res) => {
  try {
    // Validate input
    const input = createRequestSchema.parse(req.body);

    // Check for duplicate emails
    const emails = input.signatories.map(s => s.email.toLowerCase());
    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({ error: 'Duplicate emails are not allowed' });
    }

    // Get contract
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, input.contractId),
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Check ownership
    if (contract.userId !== req.session.userId) {
      return res.status(403).json({ error: 'You can only request signatures on your own contracts' });
    }

    // Check contract status
    if (contract.status === 'signed') {
      return res.status(400).json({ error: 'Contract is already signed' });
    }

    // Check for existing pending request
    const existingRequest = await db.query.signatureRequests.findFirst({
      where: and(
        eq(signatureRequests.contractId, input.contractId),
        eq(signatureRequests.status, 'pending')
      ),
    });

    if (existingRequest) {
      return res.status(400).json({
        error: 'A signature request already exists for this contract',
        existingRequestId: existingRequest.id,
      });
    }

    // 1. Generate PDF from contract
    console.log(`[SIGNATURES] Generating PDF for contract ${input.contractId}`);
    const pdfBuffer = await generateContractPDF(contract);

    // 2. Upload to DocuSeal
    console.log(`[SIGNATURES] Uploading to DocuSeal`);
    const filename = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    const docusealDoc = await docuseal.service.uploadDocument(pdfBuffer, filename);

    // 3. Create batch signature requests
    console.log(`[SIGNATURES] Creating batch request for ${input.signatories.length} signers`);
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const batchResponse = await docuseal.service.createBatchSignatureRequests({
      documentId: docusealDoc.id,
      signers: input.signatories.map((s, i) => ({
        signerName: s.name,
        signerEmail: s.email.toLowerCase(),
        signingOrder: i + 1,
      })),
      expiresAt: expiresAt.toISOString(),
    });

    // 4. Create local signature request record
    const [signatureRequest] = await db.insert(signatureRequests)
      .values({
        contractId: input.contractId,
        initiatorId: req.session.userId,
        docusealDocumentId: docusealDoc.id,
        status: 'pending',
        signingOrder: 'sequential',
        message: input.message || null,
        expiresAt,
      })
      .returning();

    // 5. Create signatory records
    const signatoryRecords = await Promise.all(
      batchResponse.signatureRequests.map(async (sr, index) => {
        const signerInput = input.signatories[index];

        // Check if signer is a registered user
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, signerInput.email.toLowerCase()),
        });

        const [signatory] = await db.insert(signatories)
          .values({
            signatureRequestId: signatureRequest.id,
            docusealRequestId: sr.id,
            signingToken: sr.signingToken,
            signingUrl: sr.signingUrl,
            email: signerInput.email.toLowerCase(),
            name: signerInput.name,
            userId: existingUser?.id || null,
            signingOrder: sr.signingOrder,
            status: sr.status === 'pending' ? 'pending' : 'waiting',
          })
          .returning();

        return signatory;
      })
    );

    // 6. Send email to first signer
    const firstSigner = signatoryRecords[0];
    const initiator = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
    });

    await sendSigningRequestEmail({
      to: firstSigner.email,
      signerName: firstSigner.name,
      contractTitle: contract.title,
      initiatorName: initiator?.name || 'Someone',
      message: input.message,
      signingUrl: firstSigner.signingUrl!,
      expiresAt: expiresAt.toISOString(),
    });

    console.log(`[SIGNATURES] Request created: ${signatureRequest.id}`);

    // Update contract status
    await db.update(contracts)
      .set({ status: 'pending_signature', updatedAt: new Date() })
      .where(eq(contracts.id, input.contractId));

    res.json({
      signatureRequest: {
        ...signatureRequest,
        signatories: signatoryRecords,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('[SIGNATURES] Error creating request:', error);
    res.status(500).json({ error: 'Failed to create signature request' });
  }
});

// ============================================
// GET SIGNATURE REQUEST
// ============================================

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.id, req.params.id),
      with: {
        signatories: {
          orderBy: signatories.signingOrder,
        },
        contract: true,
        initiator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Signature request not found' });
    }

    // Check access: initiator or signatory
    const isInitiator = request.initiatorId === req.session.userId;
    const isSignatory = request.signatories.some(
      s => s.userId === req.session.userId || s.email === req.session.userEmail
    );

    if (!isInitiator && !isSignatory) {
      return res.status(403).json({ error: 'Not authorized to view this request' });
    }

    // Hide signing URLs from non-initiators (they get their own via email)
    if (!isInitiator) {
      request.signatories = request.signatories.map(s => ({
        ...s,
        signingUrl: s.email === req.session.userEmail ? s.signingUrl : null,
        signingToken: null,
      }));
    }

    res.json({ signatureRequest: request });
  } catch (error) {
    console.error('[SIGNATURES] Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch signature request' });
  }
});

// ============================================
// LIST PENDING REQUESTS (AS INITIATOR)
// ============================================

router.get('/pending', requireAuth, async (req, res) => {
  try {
    const requests = await db.query.signatureRequests.findMany({
      where: and(
        eq(signatureRequests.initiatorId, req.session.userId),
        or(
          eq(signatureRequests.status, 'pending'),
          eq(signatureRequests.status, 'in_progress')
        )
      ),
      with: {
        signatories: {
          orderBy: signatories.signingOrder,
        },
        contract: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: desc(signatureRequests.createdAt),
    });

    res.json({ signatureRequests: requests });
  } catch (error) {
    console.error('[SIGNATURES] Error listing pending:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// ============================================
// LIST REQUESTS TO SIGN (AS SIGNATORY)
// ============================================

router.get('/to-sign', requireAuth, async (req, res) => {
  try {
    // Find signatories where user is the signer
    const userSignatories = await db.query.signatories.findMany({
      where: and(
        or(
          eq(signatories.userId, req.session.userId),
          eq(signatories.email, req.session.userEmail)
        ),
        eq(signatories.status, 'pending')
      ),
      with: {
        signatureRequest: {
          with: {
            contract: {
              columns: {
                id: true,
                title: true,
              },
            },
            initiator: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Transform to include signing URL
    const toSign = userSignatories
      .filter(s => s.signatureRequest.status !== 'cancelled')
      .map(s => ({
        id: s.signatureRequest.id,
        contractId: s.signatureRequest.contractId,
        contractTitle: s.signatureRequest.contract.title,
        initiator: s.signatureRequest.initiator,
        message: s.signatureRequest.message,
        signingUrl: s.signingUrl,
        expiresAt: s.signatureRequest.expiresAt,
        createdAt: s.signatureRequest.createdAt,
      }));

    res.json({ toSign });
  } catch (error) {
    console.error('[SIGNATURES] Error listing to-sign:', error);
    res.status(500).json({ error: 'Failed to fetch requests to sign' });
  }
});

// ============================================
// CANCEL SIGNATURE REQUEST
// ============================================

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const request = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.id, req.params.id),
      with: { signatories: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Signature request not found' });
    }

    if (request.initiatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Only the initiator can cancel a request' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed request' });
    }

    // Update status
    await db.update(signatureRequests)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(signatureRequests.id, req.params.id));

    // Update contract status back to draft
    await db.update(contracts)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(contracts.id, request.contractId));

    // TODO: Send cancellation emails to signatories

    console.log(`[SIGNATURES] Request cancelled: ${request.id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[SIGNATURES] Error cancelling request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// ============================================
// SEND REMINDER
// ============================================

router.post('/:id/remind', requireAuth, async (req, res) => {
  try {
    const input = remindSchema.parse(req.body);

    const request = await db.query.signatureRequests.findFirst({
      where: eq(signatureRequests.id, req.params.id),
      with: {
        signatories: true,
        contract: true,
        initiator: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Signature request not found' });
    }

    if (request.initiatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Only the initiator can send reminders' });
    }

    const signatory = request.signatories.find(s => s.id === input.signatoryId);

    if (!signatory) {
      return res.status(404).json({ error: 'Signatory not found' });
    }

    if (signatory.status !== 'pending') {
      return res.status(400).json({
        error: signatory.status === 'signed'
          ? 'Signatory has already signed'
          : 'Signatory is not ready to sign yet',
      });
    }

    await sendSigningReminderEmail({
      to: signatory.email,
      signerName: signatory.name,
      contractTitle: request.contract.title,
      initiatorName: request.initiator.name,
      signingUrl: signatory.signingUrl!,
      expiresAt: request.expiresAt?.toISOString(),
    });

    console.log(`[SIGNATURES] Reminder sent to ${signatory.email}`);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('[SIGNATURES] Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// ============================================
// GET ALL REQUESTS (HISTORY)
// ============================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = eq(signatureRequests.initiatorId, req.session.userId);

    if (status && typeof status === 'string') {
      whereClause = and(whereClause, eq(signatureRequests.status, status));
    }

    const requests = await db.query.signatureRequests.findMany({
      where: whereClause,
      with: {
        signatories: {
          orderBy: signatories.signingOrder,
        },
        contract: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: desc(signatureRequests.createdAt),
      limit: 50,
    });

    res.json({ signatureRequests: requests });
  } catch (error) {
    console.error('[SIGNATURES] Error listing requests:', error);
    res.status(500).json({ error: 'Failed to fetch signature requests' });
  }
});

export default router;
```

### Register Router

```typescript
// server/routes/index.ts
import signaturesRouter from './signatures';

// Add with other routers
app.use('/api/signatures', signaturesRouter);
```

### PDF Generator Service

```typescript
// server/services/pdfGenerator.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Contract } from '../db/schema/contracts';

export async function generateContractPDF(contract: Contract): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const fontSize = 11;
  const titleSize = 16;
  const margin = 50;
  const lineHeight = fontSize * 1.4;

  // Add first page
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  let yPosition = height - margin;

  // Draw title
  page.drawText(contract.title.toUpperCase(), {
    x: margin,
    y: yPosition,
    size: titleSize,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= titleSize * 2;

  // Draw content
  // If contract has renderedContent (from template), parse and render it
  // Otherwise, render plain text content
  const content = contract.renderedContent || contract.content || '';

  // Simple text wrapping
  const maxWidth = width - 2 * margin;
  const words = content.split(/\s+/);
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const textWidth = timesRoman.widthOfTextAtSize(testLine, fontSize);

    if (textWidth > maxWidth && line) {
      // Draw current line
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: timesRoman,
      });
      yPosition -= lineHeight;
      line = word;

      // Check for new page
      if (yPosition < margin + lineHeight) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = height - margin;
      }
    } else {
      line = testLine;
    }
  }

  // Draw remaining text
  if (line) {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font: timesRoman,
    });
  }

  // Add signature placeholder section
  yPosition -= lineHeight * 4;
  if (yPosition < margin + 150) {
    page = pdfDoc.addPage([612, 792]);
    yPosition = height - margin;
  }

  page.drawText('SIGNATURES', {
    x: margin,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  yPosition -= lineHeight * 2;

  // Signature lines will be placed by DocuSeal
  page.drawText('_______________________________', {
    x: margin,
    y: yPosition,
    size: fontSize,
    font: timesRoman,
  });
  yPosition -= lineHeight;
  page.drawText('Signature', {
    x: margin,
    y: yPosition,
    size: 9,
    font: timesRoman,
  });

  page.drawText('_______________________________', {
    x: width / 2,
    y: yPosition + lineHeight,
    size: fontSize,
    font: timesRoman,
  });
  page.drawText('Date', {
    x: width / 2,
    y: yPosition,
    size: 9,
    font: timesRoman,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

## Definition of Done

- [ ] All endpoints implemented and tested
- [ ] PDF generation working
- [ ] DocuSeal integration working
- [ ] Local records created correctly
- [ ] Authorization checks passing
- [ ] Input validation with Zod
- [ ] Error handling complete
- [ ] Emails sent to first signer
- [ ] Contract status updated

## Testing Checklist

### Unit Tests

- [ ] Input validation schemas
- [ ] PDF generation
- [ ] Authorization logic

### Integration Tests

```typescript
describe('POST /api/signatures/request', () => {
  it('creates signature request with valid input', async () => {
    const response = await request(app)
      .post('/api/signatures/request')
      .set('Cookie', authCookie)
      .send({
        contractId: testContract.id,
        signatories: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
        ],
        message: 'Please sign this contract',
      });

    expect(response.status).toBe(200);
    expect(response.body.signatureRequest).toBeDefined();
    expect(response.body.signatureRequest.signatories).toHaveLength(2);
    expect(response.body.signatureRequest.signatories[0].status).toBe('pending');
    expect(response.body.signatureRequest.signatories[1].status).toBe('waiting');
  });

  it('rejects duplicate emails', async () => {
    const response = await request(app)
      .post('/api/signatures/request')
      .set('Cookie', authCookie)
      .send({
        contractId: testContract.id,
        signatories: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'John Again', email: 'john@example.com' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Duplicate');
  });

  it('requires authorization', async () => {
    const response = await request(app)
      .post('/api/signatures/request')
      .send({ contractId: 'test', signatories: [] });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/signatures/:id', () => {
  it('cancels pending request', async () => {
    const response = await request(app)
      .delete(`/api/signatures/${testRequest.id}`)
      .set('Cookie', authCookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('prevents cancelling completed request', async () => {
    // ... test completed request
  });
});
```

### E2E Tests

- [ ] Full flow: create request → get status → cancel
- [ ] Reminder email sending

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.1: DocuSeal Integration Service](./4-1-docuseal-integration-service.md)
- [Story 4.3: Add Signatories UI](./4-3-add-signatories-ui.md)
- [Story 4.5: Webhook Handler](./4-5-webhook-handler.md)
