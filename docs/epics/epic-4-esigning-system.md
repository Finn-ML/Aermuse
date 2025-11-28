# Epic 4: E-Signing System (DocuSeal Integration)

## Epic Overview

| Field | Value |
|-------|-------|
| **Epic ID** | EPIC-004 |
| **Title** | E-Signing System |
| **Priority** | P0 - Critical |
| **Estimated Effort** | 4-5 days |
| **Dependencies** | DocuSeal API (hosted), Email service |

## Description

Integrate with the DocuSeal e-signing API to enable complete e-signature workflows. Users can send contracts for signature, track signing status in real-time, and receive completed signed documents automatically.

**DocuSeal API Base URL:** `https://docu-seal-host--finn107.replit.app/api`

## Business Value

- Core MVP feature for contract workflow completion
- Enables legally binding digital agreements
- Leverages existing DocuSeal infrastructure (no need to build signing UI)
- Automatic record-keeping for all parties
- Sequential and parallel multi-party signing support

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Aermuse UI    │────▶│  Aermuse API    │────▶│  DocuSeal API   │
│                 │     │                 │     │                 │
│ - Add signers   │     │ - Upload PDF    │     │ - Store docs    │
│ - Track status  │     │ - Create reqs   │     │ - Capture sigs  │
│ - View history  │     │ - Handle hooks  │     │ - Generate PDF  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               ▲
                               │ Webhooks
                               │
                        ┌──────┴──────┐
                        │ signature.  │
                        │ completed   │
                        │ document.   │
                        │ completed   │
                        └─────────────┘
```

## Acceptance Criteria

- [ ] Users can add multiple signatories to contracts
- [ ] Contracts uploaded to DocuSeal as PDFs
- [ ] Signatories receive signing URLs (via Aermuse email or direct link)
- [ ] Real-time status tracking via webhooks
- [ ] Signed contracts downloaded and stored in Aermuse
- [ ] Support for sequential signing order

---

## User Stories

### Story 4.1: DocuSeal Integration Service

**As a** developer
**I want** a service layer for DocuSeal API communication
**So that** all signing operations go through a consistent interface

**Acceptance Criteria:**
- [ ] DocuSeal client service created
- [ ] API key configuration via environment variable
- [ ] Document upload (PDF)
- [ ] Single signature request creation
- [ ] Batch signature request creation
- [ ] Status retrieval
- [ ] Signed document download
- [ ] Error handling and retry logic
- [ ] TypeScript types for all API responses

**Technical Notes:**
```typescript
// server/services/docuseal.ts
const DOCUSEAL_BASE_URL = 'https://docu-seal-host--finn107.replit.app/api';

interface DocuSealConfig {
  apiKey: string;
  baseUrl: string;
}

class DocuSealService {
  // Document operations
  async uploadDocument(pdfBuffer: Buffer, filename: string): Promise<DocuSealDocument>;
  async getDocument(documentId: string): Promise<DocuSealDocument>;
  async downloadSignedDocument(documentId: string): Promise<Buffer>;

  // Signature request operations
  async createSignatureRequest(request: SignatureRequest): Promise<SignatureRequestResponse>;
  async createBatchSignatureRequests(request: BatchSignatureRequest): Promise<BatchSignatureResponse>;
  async getSignatureRequest(requestId: string): Promise<SignatureRequestStatus>;

  // Webhook operations
  async registerWebhook(url: string, events: string[]): Promise<WebhookRegistration>;
}
```

**Story Points:** 5

---

### Story 4.2: Signature Request Data Model

**As a** developer
**I want** local database tables to track signing requests
**So that** we can sync status and provide history

**Acceptance Criteria:**
- [ ] `signature_requests` table stores local reference to DocuSeal requests
- [ ] `signatories` table tracks each signer and their status
- [ ] Store DocuSeal document ID and request IDs
- [ ] Track signing URLs for each signatory
- [ ] Status synced from DocuSeal webhooks
- [ ] Audit trail: created, viewed, signed timestamps

**Technical Notes:**
```sql
CREATE TABLE signature_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  initiator_id VARCHAR NOT NULL REFERENCES users(id),
  docuseal_document_id VARCHAR,           -- DocuSeal document ID
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, expired, cancelled
  signing_order TEXT DEFAULT 'sequential', -- parallel or sequential
  message TEXT,                           -- message to signatories
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  signed_pdf_url TEXT,                    -- URL or path to signed PDF
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE signatories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id VARCHAR NOT NULL REFERENCES signature_requests(id),
  docuseal_request_id VARCHAR,            -- DocuSeal signature request ID
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id VARCHAR REFERENCES users(id),   -- null for guests
  signing_order INTEGER DEFAULT 1,
  signing_url TEXT,                       -- DocuSeal signing URL
  signing_token VARCHAR,                  -- DocuSeal token
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, pending, signed
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Story Points:** 3

---

### Story 4.3: Add Signatories UI

**As a** user
**I want** to add signatories to my contract
**So that** they can sign it

**Acceptance Criteria:**
- [ ] "Request Signatures" button on contract view
- [ ] Add signatories by email and name
- [ ] Add multiple signatories (2-10 parties)
- [ ] Remove signatories before sending
- [ ] Set signing order (drag to reorder)
- [ ] Optional message to signatories
- [ ] Set expiration date (default 30 days)
- [ ] Preview list before sending
- [ ] Validation: valid emails, at least 1 signer

**Story Points:** 3

---

### Story 4.4: Signature Request API

**As a** developer
**I want** API endpoints for signature requests
**So that** the frontend can manage signing workflows

**Acceptance Criteria:**
- [ ] `POST /api/signatures/request` - Create signature request
  - Generates PDF from contract
  - Uploads to DocuSeal
  - Creates batch signature requests
  - Stores local records
  - Returns signing URLs
- [ ] `GET /api/signatures/:id` - Get request status with all signatories
- [ ] `GET /api/signatures/pending` - List user's pending requests (as initiator)
- [ ] `GET /api/signatures/to-sign` - List requests where user is a signatory
- [ ] `DELETE /api/signatures/:id` - Cancel request (before completion)
- [ ] `POST /api/signatures/:id/remind` - Resend signing URL email

**Technical Notes:**
```typescript
// POST /api/signatures/request
app.post('/api/signatures/request', requireAuth, async (req, res) => {
  const { contractId, signatories, message, expiresAt } = req.body;

  // 1. Get contract and generate PDF
  const contract = await getContract(contractId);
  const pdfBuffer = await generateContractPDF(contract);

  // 2. Upload to DocuSeal
  const docusealDoc = await docuseal.uploadDocument(pdfBuffer, `${contract.title}.pdf`);

  // 3. Create batch signature requests
  const batchResponse = await docuseal.createBatchSignatureRequests({
    documentId: docusealDoc.id,
    signers: signatories.map((s, i) => ({
      signerName: s.name,
      signerEmail: s.email,
      signingOrder: i + 1
    })),
    expiresAt
  });

  // 4. Store locally and return
  // ...
});
```

**Story Points:** 5

---

### Story 4.5: Webhook Handler

**As a** developer
**I want** to receive DocuSeal webhook events
**So that** signing status updates in real-time

**Acceptance Criteria:**
- [ ] `POST /api/webhooks/docuseal` endpoint
- [ ] Verify webhook signature using secret
- [ ] Handle `signature.completed` - update signatory status
- [ ] Handle `signature.next_signer_ready` - notify next signer
- [ ] Handle `document.completed` - download signed PDF, update contract
- [ ] Store signed PDF in Aermuse storage
- [ ] Update contract status to "signed"
- [ ] Trigger email notifications to all parties

**Technical Notes:**
```typescript
// Webhook events to handle
const WEBHOOK_EVENTS = [
  'signature.completed',
  'signature.next_signer_ready',
  'document.completed'
];

app.post('/api/webhooks/docuseal', async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];

  // Verify signature
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  switch (event) {
    case 'signature.completed':
      await handleSignatureCompleted(req.body);
      break;
    case 'document.completed':
      await handleDocumentCompleted(req.body);
      break;
    case 'signature.next_signer_ready':
      await handleNextSignerReady(req.body);
      break;
  }

  res.json({ received: true });
});
```

**Story Points:** 5

---

### Story 4.6: Email Notifications

**As a** signatory
**I want** to receive email when asked to sign
**So that** I know there's a contract waiting

**Acceptance Criteria:**
- [ ] Email sent when signature request created (includes signing URL)
- [ ] Email includes: sender name, contract title, message, "Sign Now" button
- [ ] Email sent when it's user's turn (sequential signing)
- [ ] Reminder email endpoint (manual trigger)
- [ ] Confirmation email after signing
- [ ] Final signed copy emailed when all signed
- [ ] Professional email templates matching Aermuse brand

**Technical Notes:**
- Use existing email service (SendGrid/Nodemailer)
- Templates: signing-request, signing-reminder, signature-confirmed, document-completed

**Story Points:** 4

---

### Story 4.7: Signature Status Tracking UI

**As a** contract initiator
**I want** to see the signing status in real-time
**So that** I know who has signed

**Acceptance Criteria:**
- [ ] Status page showing all signatories
- [ ] Status per signatory: waiting → pending → signed
- [ ] Visual progress indicator (steps/timeline)
- [ ] Timestamps for each status change
- [ ] "Send Reminder" button for pending signatories
- [ ] "Cancel Request" button (before completion)
- [ ] Copy signing URL button
- [ ] Overall status badge on contract card

**Story Points:** 3

---

### Story 4.8: Awaiting Signature Dashboard

**As a** registered user
**I want** to see contracts awaiting my signature
**So that** I can sign them from my dashboard

**Acceptance Criteria:**
- [ ] "Awaiting Your Signature" section on dashboard
- [ ] Badge/count in navigation
- [ ] List shows: contract title, from (initiator), date requested
- [ ] "Sign Now" button opens DocuSeal signing page
- [ ] After signing, contract appears in user's contracts list
- [ ] Filter: show/hide signed items

**Story Points:** 3

---

### Story 4.9: Signed Document Storage

**As a** party to a signed contract
**I want** the final signed copy stored in my account
**So that** I have a record

**Acceptance Criteria:**
- [ ] Download signed PDF from DocuSeal when complete
- [ ] Store PDF in Aermuse file storage
- [ ] Link PDF to contract record
- [ ] Contract status updated to "signed"
- [ ] Signed PDF visible/downloadable for initiator
- [ ] Signed PDF added to registered signatories' accounts
- [ ] Audit trail preserved (who signed when)

**Technical Notes:**
- Triggered by `document.completed` webhook
- Store in same storage as uploaded contracts

**Story Points:** 3

---

### Story 4.10: Decline & Cancellation

**As a** signatory or initiator
**I want** to decline or cancel a signing request
**So that** I can opt out of the agreement

**Acceptance Criteria:**
- [ ] Initiator can cancel pending requests
- [ ] Cancel removes from all parties' pending lists
- [ ] All signatories notified of cancellation
- [ ] Contract status updated to "cancelled"
- [ ] Expired requests handled gracefully
- [ ] Clear messaging when signing link is invalid/expired

**Technical Notes:**
- DocuSeal handles expiration
- Aermuse handles cancellation (don't send to DocuSeal)

**Story Points:** 2

---

## Total Story Points: 36

## Definition of Done

- [ ] DocuSeal integration fully functional
- [ ] Sequential multi-signer workflow works
- [ ] Webhooks update status in real-time
- [ ] Signed PDFs downloaded and stored
- [ ] Email notifications sent at each step
- [ ] Dashboard shows pending signatures
- [ ] Status tracking accurate
- [ ] Error handling for API failures

## API Reference

### DocuSeal Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/documents` | Upload contract PDF |
| `GET /api/documents/:id` | Get document with status |
| `GET /api/documents/:id/download` | Download signed PDF |
| `POST /api/signature-requests/batch` | Create multi-signer request |
| `GET /api/signature-requests/:id` | Check request status |
| `POST /api/webhooks` | Register webhook |

### Webhook Events

| Event | Action |
|-------|--------|
| `signature.completed` | Update signatory status, notify initiator |
| `signature.next_signer_ready` | Send email to next signer |
| `document.completed` | Download PDF, update contract, notify all |

## Environment Variables

```bash
DOCUSEAL_API_KEY=sk_live_xxx
DOCUSEAL_BASE_URL=https://docu-seal-host--finn107.replit.app/api
DOCUSEAL_WEBHOOK_SECRET=whsec_xxx
```
