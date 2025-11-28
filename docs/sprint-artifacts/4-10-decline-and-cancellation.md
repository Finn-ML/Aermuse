# Story 4.10: Decline & Cancellation

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.10 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Decline & Cancellation |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** signatory or initiator
**I want** to decline or cancel a signing request
**So that** I can opt out of the agreement

## Context

Users need the ability to cancel or decline signature requests. Initiators can cancel pending requests, and the system needs to handle expired requests gracefully. Note: DocuSeal handles the signing page - Aermuse handles cancellation on our side and expiration messaging.

**Dependencies:**
- Story 4.4 (API) for cancellation endpoint
- Story 4.6 (Emails) for notification templates

## Acceptance Criteria

- [ ] **AC-1:** Initiator can cancel pending requests
- [ ] **AC-2:** Cancellation removes request from all parties' pending lists
- [ ] **AC-3:** All signatories notified of cancellation
- [ ] **AC-4:** Contract status updated to "cancelled"
- [ ] **AC-5:** Expired requests handled gracefully
- [ ] **AC-6:** Clear messaging when signing link is invalid/expired
- [ ] **AC-7:** Cannot cancel completed requests
- [ ] **AC-8:** Cancellation confirmation dialog

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/signatures.ts` | Add/update cancellation logic |
| `server/services/email/signing.ts` | Add cancellation email |
| `client/src/components/signatures/CancelRequestDialog.tsx` | New: Confirmation dialog |
| `server/jobs/expireRequests.ts` | New: Cron job for expiration |

### Implementation

#### Cancellation API (Enhanced)

```typescript
// server/routes/signatures.ts - Enhanced DELETE endpoint

// DELETE /api/signatures/:id - Cancel signature request
router.delete('/:id', requireAuth, async (req, res) => {
  try {
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

    // Only initiator can cancel
    if (request.initiatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Only the initiator can cancel a request' });
    }

    // Cannot cancel completed requests
    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed request' });
    }

    // Already cancelled
    if (request.status === 'cancelled') {
      return res.status(400).json({ error: 'Request is already cancelled' });
    }

    // Update signature request status
    await db
      .update(signatureRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, req.params.id));

    // Update contract status back to draft
    await db
      .update(contracts)
      .set({
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, request.contractId));

    // Send cancellation emails to all signatories who haven't signed yet
    const pendingSignatories = request.signatories.filter(
      s => s.status !== 'signed'
    );

    for (const signatory of pendingSignatories) {
      await sendRequestCancelledEmail({
        to: signatory.email,
        recipientName: signatory.name,
        contractTitle: request.contract.title,
        initiatorName: request.initiator.name,
      });
    }

    console.log(`[SIGNATURES] Request cancelled: ${request.id} by ${req.session.userId}`);

    res.json({
      success: true,
      message: `Request cancelled. ${pendingSignatories.length} signatories notified.`,
    });
  } catch (error) {
    console.error('[SIGNATURES] Error cancelling request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});
```

#### Cancellation Email

```typescript
// server/services/email/signing.ts - Add cancellation email

interface RequestCancelledEmailOptions {
  to: string;
  recipientName: string;
  contractTitle: string;
  initiatorName: string;
}

export async function sendRequestCancelledEmail(options: RequestCancelledEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Signature Request Cancelled
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${options.recipientName},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      <strong>${options.initiatorName}</strong> has cancelled the signature request for the following contract:
    </p>

    ${infoBox(`
      <h3 style="margin: 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
    `)}

    <p style="margin: 0; font-size: 14px; color: #666;">
      No action is required from you. Any signing links you received for this contract are no longer valid.
    </p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Cancelled: ${options.contractTitle}`,
    html: baseTemplate(content),
  });
}
```

#### Cancel Request Dialog

```tsx
// client/src/components/signatures/CancelRequestDialog.tsx
import { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  contractTitle: string;
  pendingSignatoryCount: number;
}

export function CancelRequestDialog({
  isOpen,
  onClose,
  onConfirm,
  contractTitle,
  pendingSignatoryCount,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="font-semibold text-lg">Cancel Signature Request</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to cancel the signature request for:
          </p>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="font-medium">{contractTitle}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <p className="text-yellow-800">
              <strong>This action cannot be undone.</strong>
              {pendingSignatoryCount > 0 && (
                <span>
                  {' '}
                  {pendingSignatoryCount} pending{' '}
                  {pendingSignatoryCount === 1 ? 'signatory' : 'signatories'}{' '}
                  will be notified.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Keep Request
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Expiration Handling

```typescript
// server/jobs/expireRequests.ts
import { db } from '../db';
import { signatureRequests, signatories } from '../db/schema/signatures';
import { contracts } from '../db/schema/contracts';
import { lt, eq, and } from 'drizzle-orm';

/**
 * Mark expired signature requests
 * Run this as a cron job (e.g., daily at midnight)
 */
export async function expireOldRequests() {
  const now = new Date();

  // Find expired requests that are still pending/in_progress
  const expiredRequests = await db.query.signatureRequests.findMany({
    where: and(
      lt(signatureRequests.expiresAt, now),
      eq(signatureRequests.status, 'pending')
    ),
    with: {
      contract: true,
      signatories: true,
    },
  });

  console.log(`[EXPIRY] Found ${expiredRequests.length} expired requests`);

  for (const request of expiredRequests) {
    // Update request status
    await db
      .update(signatureRequests)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(eq(signatureRequests.id, request.id));

    // Update contract status back to draft
    await db
      .update(contracts)
      .set({
        status: 'draft',
        updatedAt: now,
      })
      .where(eq(contracts.id, request.contractId));

    // Optionally notify initiator
    // await sendExpirationNotification(request);

    console.log(`[EXPIRY] Marked expired: ${request.id}`);
  }

  return expiredRequests.length;
}

// Schedule with node-cron or similar
// import cron from 'node-cron';
// cron.schedule('0 0 * * *', expireOldRequests); // Daily at midnight
```

#### Expired/Invalid Link Page

```tsx
// client/src/pages/SigningLinkExpired.tsx
import { Link } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';

interface Props {
  reason: 'expired' | 'cancelled' | 'invalid' | 'completed';
}

export function SigningLinkExpired({ reason }: Props) {
  const messages = {
    expired: {
      icon: Clock,
      title: 'Signing Link Expired',
      description: 'This signing link has expired. Please contact the sender for a new link.',
    },
    cancelled: {
      icon: AlertCircle,
      title: 'Request Cancelled',
      description: 'This signature request has been cancelled by the sender.',
    },
    invalid: {
      icon: AlertCircle,
      title: 'Invalid Link',
      description: 'This signing link is invalid or has already been used.',
    },
    completed: {
      icon: AlertCircle,
      title: 'Already Signed',
      description: 'This contract has already been fully signed.',
    },
  };

  const { icon: Icon, title, description } = messages[reason];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon className="h-8 w-8 text-gray-500" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h1>

        <p className="text-gray-600 mb-6">
          {description}
        </p>

        <Link
          to="/"
          className="inline-block px-6 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
        >
          Go to Aermuse
        </Link>
      </div>
    </div>
  );
}
```

#### Check Request Status Before Action

```typescript
// Add to signing-related endpoints
function checkRequestStatus(status: string): { valid: boolean; error?: string } {
  switch (status) {
    case 'completed':
      return { valid: false, error: 'This contract has already been signed' };
    case 'cancelled':
      return { valid: false, error: 'This signature request has been cancelled' };
    case 'expired':
      return { valid: false, error: 'This signature request has expired' };
    default:
      return { valid: true };
  }
}
```

### Cron Job Setup

```typescript
// server/index.ts or server/jobs/index.ts
import cron from 'node-cron';
import { expireOldRequests } from './jobs/expireRequests';

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running expiry check...');
  try {
    const count = await expireOldRequests();
    console.log(`[CRON] Expired ${count} requests`);
  } catch (error) {
    console.error('[CRON] Expiry check failed:', error);
  }
});
```

## Definition of Done

- [ ] Initiator can cancel pending requests
- [ ] Cancellation updates status to "cancelled"
- [ ] Contract status returns to "draft"
- [ ] All pending signatories notified
- [ ] Confirmation dialog prevents accidental cancellation
- [ ] Cannot cancel completed requests
- [ ] Expired requests marked automatically
- [ ] Invalid/expired link shows friendly message
- [ ] Cron job configured for expiration

## Testing Checklist

### Unit Tests

- [ ] checkRequestStatus function
- [ ] expireOldRequests finds correct requests

### Integration Tests

- [ ] Cancel request API
- [ ] Email sent to signatories
- [ ] Status updates propagate correctly

### E2E Tests

- [ ] Cancel from status page
- [ ] Confirmation dialog shown
- [ ] Signatories see cancellation (if logged in)
- [ ] Try to sign after cancellation → error

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)
- [Story 4.6: Email Notifications](./4-6-email-notifications.md)
- [Story 4.7: Signature Status Tracking UI](./4-7-signature-status-tracking-ui.md)
