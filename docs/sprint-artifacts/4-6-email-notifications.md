# Story 4.6: Email Notifications

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 4.6 |
| **Epic** | Epic 4: E-Signing System |
| **Title** | Email Notifications |
| **Priority** | P0 - Critical |
| **Story Points** | 4 |
| **Status** | Drafted |

## User Story

**As a** signatory
**I want** to receive email when asked to sign
**So that** I know there's a contract waiting

## Context

Email notifications are critical for the e-signing workflow. Signatories need to be notified when they need to sign, when it's their turn (sequential signing), and when the document is complete. The initiator needs updates on signing progress.

**Dependencies:**
- Email service configuration (SendGrid/Nodemailer)
- Story 4.4 (API) and Story 4.5 (Webhooks) call these functions

## Acceptance Criteria

- [ ] **AC-1:** Email sent when signature request created (first signer)
- [ ] **AC-2:** Email sent when it's user's turn (sequential signing)
- [ ] **AC-3:** Email includes: sender name, contract title, message, "Sign Now" button
- [ ] **AC-4:** Reminder email endpoint (manual trigger)
- [ ] **AC-5:** Confirmation email after signing
- [ ] **AC-6:** Notification to initiator when someone signs
- [ ] **AC-7:** Final signed copy email when all signed
- [ ] **AC-8:** Professional email templates matching Aermuse brand
- [ ] **AC-9:** Unsubscribe/manage preferences link

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/email/index.ts` | Email service setup |
| `server/services/email/templates.ts` | Email templates |
| `server/services/email/signing.ts` | Signing-specific emails |

### Email Templates Required

| Template | Trigger | Recipient |
|----------|---------|-----------|
| `signing-request` | Request created / next signer ready | Signatory |
| `signing-reminder` | Manual reminder | Signatory |
| `signature-confirmed` | After signing | Signer |
| `signature-notification` | Someone signs | Initiator |
| `document-completed` | All signed | All parties |

### Implementation

#### Email Service Setup

```typescript
// server/services/email/index.ts
import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';

// Configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'Aermuse <noreply@aermuse.com>';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('[EMAIL] SMTP not configured - emails will be logged only');
      // Return a mock transporter for development
      transporter = {
        sendMail: async (options: nodemailer.SendMailOptions) => {
          console.log('[EMAIL] Would send:', {
            to: options.to,
            subject: options.subject,
          });
          return { messageId: 'mock' };
        },
      } as nodemailer.Transporter;
    } else {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
    }
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SentMessageInfo> {
  const transport = getTransporter();

  const result = await transport.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
  });

  console.log(`[EMAIL] Sent: "${options.subject}" to ${options.to}`);
  return result;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
```

#### Base Template

```typescript
// server/services/email/templates.ts

const APP_URL = process.env.APP_URL || 'https://aermuse.com';
const BRAND_COLOR = '#722F37'; // Burgundy

export function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aermuse</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Aermuse</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
                Contract management for music professionals
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                <a href="${APP_URL}" style="color: ${BRAND_COLOR}; text-decoration: none;">aermuse.com</a>
                &nbsp;|&nbsp;
                <a href="${APP_URL}/settings/notifications" style="color: #999; text-decoration: none;">Manage notifications</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function button(text: string, url: string): string {
  return `
    <a href="${url}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
      ${text}
    </a>
  `;
}

export function infoBox(content: string): string {
  return `
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      ${content}
    </div>
  `;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

#### Signing Email Functions

```typescript
// server/services/email/signing.ts
import { sendEmail } from './index';
import { baseTemplate, button, infoBox, formatDate } from './templates';

const APP_URL = process.env.APP_URL || 'https://aermuse.com';

// ============================================
// SIGNING REQUEST EMAIL
// ============================================

interface SigningRequestEmailOptions {
  to: string;
  signerName: string;
  contractTitle: string;
  initiatorName: string;
  message?: string;
  signingUrl: string;
  expiresAt?: string;
}

export async function sendSigningRequestEmail(options: SigningRequestEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Hello ${options.signerName},
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      <strong>${options.initiatorName}</strong> has requested your signature on a contract.
    </p>

    ${infoBox(`
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
      ${options.message ? `
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666; font-style: italic;">
          "${options.message}"
        </p>
      ` : ''}
    `)}

    <p style="margin: 0 0 24px 0; text-align: center;">
      ${button('Review & Sign', options.signingUrl)}
    </p>

    ${options.expiresAt ? `
      <p style="margin: 0; font-size: 14px; color: #999; text-align: center;">
        This request expires on ${formatDate(options.expiresAt)}
      </p>
    ` : ''}
  `;

  await sendEmail({
    to: options.to,
    subject: `Signature requested: ${options.contractTitle}`,
    html: baseTemplate(content),
  });
}

// ============================================
// SIGNING REMINDER EMAIL
// ============================================

interface SigningReminderEmailOptions {
  to: string;
  signerName: string;
  contractTitle: string;
  initiatorName: string;
  signingUrl: string;
  expiresAt?: string;
}

export async function sendSigningReminderEmail(options: SigningReminderEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Reminder: Signature needed
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${options.signerName}, this is a friendly reminder that <strong>${options.initiatorName}</strong> is waiting for your signature.
    </p>

    ${infoBox(`
      <h3 style="margin: 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
    `)}

    <p style="margin: 0 0 24px 0; text-align: center;">
      ${button('Sign Now', options.signingUrl)}
    </p>

    ${options.expiresAt ? `
      <p style="margin: 0; font-size: 14px; color: #d9534f; text-align: center; font-weight: 500;">
        Please sign before ${formatDate(options.expiresAt)}
      </p>
    ` : ''}
  `;

  await sendEmail({
    to: options.to,
    subject: `Reminder: Please sign "${options.contractTitle}"`,
    html: baseTemplate(content),
  });
}

// ============================================
// SIGNATURE CONFIRMED EMAIL
// ============================================

interface SignatureConfirmedEmailOptions {
  to: string;
  signerName: string;
  contractTitle: string;
}

export async function sendSignatureConfirmedEmail(options: SignatureConfirmedEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Signature confirmed
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Thank you, ${options.signerName}! Your signature has been recorded.
    </p>

    ${infoBox(`
      <h3 style="margin: 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
    `)}

    <p style="margin: 0; font-size: 14px; color: #666;">
      You'll receive a copy of the fully signed contract once all parties have signed.
    </p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Signature confirmed: ${options.contractTitle}`,
    html: baseTemplate(content),
  });
}

// ============================================
// SIGNATURE NOTIFICATION TO INITIATOR
// ============================================

interface SignatureNotificationOptions {
  to: string;
  initiatorName: string;
  signerName: string;
  contractTitle: string;
  signedCount: number;
  totalCount: number;
}

export async function sendSignatureNotificationToInitiator(options: SignatureNotificationOptions) {
  const progress = `${options.signedCount} of ${options.totalCount}`;
  const isComplete = options.signedCount === options.totalCount;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      ${isComplete ? 'All signatures collected!' : 'New signature received'}
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${options.initiatorName}, <strong>${options.signerName}</strong> has signed your contract.
    </p>

    ${infoBox(`
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
      <p style="margin: 0; font-size: 14px; color: #666;">
        Progress: ${progress} signatures
      </p>
      <!-- Progress bar -->
      <div style="background-color: #e0e0e0; border-radius: 4px; height: 8px; margin-top: 12px; overflow: hidden;">
        <div style="background-color: #722F37; height: 100%; width: ${(options.signedCount / options.totalCount) * 100}%;"></div>
      </div>
    `)}

    <p style="margin: 0 0 24px 0; text-align: center;">
      ${button('View Status', `${APP_URL}/contracts`)}
    </p>
  `;

  await sendEmail({
    to: options.to,
    subject: isComplete
      ? `All signed: ${options.contractTitle}`
      : `Signature received: ${options.contractTitle} (${progress})`,
    html: baseTemplate(content),
  });
}

// ============================================
// DOCUMENT COMPLETED EMAIL
// ============================================

interface DocumentCompletedEmailOptions {
  to: string;
  recipientName: string;
  contractTitle: string;
  downloadUrl: string;
}

export async function sendDocumentCompletedEmail(options: DocumentCompletedEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Contract fully signed!
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${options.recipientName}, all parties have signed the contract. A copy has been sent to everyone.
    </p>

    ${infoBox(`
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
      <p style="margin: 0; font-size: 14px; color: #28a745;">
        ✓ Fully executed
      </p>
    `)}

    <p style="margin: 0 0 24px 0; text-align: center;">
      ${button('Download Signed PDF', `${APP_URL}${options.downloadUrl}`)}
    </p>

    <p style="margin: 0; font-size: 14px; color: #666;">
      This signed document is now stored securely in your Aermuse account.
    </p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Fully signed: ${options.contractTitle}`,
    html: baseTemplate(content),
  });
}

// ============================================
// REQUEST CANCELLED EMAIL
// ============================================

interface RequestCancelledEmailOptions {
  to: string;
  recipientName: string;
  contractTitle: string;
  initiatorName: string;
}

export async function sendRequestCancelledEmail(options: RequestCancelledEmailOptions) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">
      Signature request cancelled
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #555;">
      Hi ${options.recipientName}, the signature request for the following contract has been cancelled by ${options.initiatorName}.
    </p>

    ${infoBox(`
      <h3 style="margin: 0; font-size: 16px; color: #333;">
        ${options.contractTitle}
      </h3>
    `)}

    <p style="margin: 0; font-size: 14px; color: #666;">
      No action is needed from you. Any signing links you received are no longer valid.
    </p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Cancelled: ${options.contractTitle}`,
    html: baseTemplate(content),
  });
}
```

#### Export All Functions

```typescript
// server/services/email/index.ts (add exports)
export * from './signing';
```

### Environment Variables

```bash
# .env
# Email configuration
EMAIL_FROM=Aermuse <noreply@aermuse.com>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# App URL for links in emails
APP_URL=https://aermuse.com
```

## Definition of Done

- [ ] All email templates created
- [ ] Signing request email working
- [ ] Reminder email working
- [ ] Confirmation email working
- [ ] Initiator notification working
- [ ] Document completed email working
- [ ] Templates responsive on mobile
- [ ] Links correctly point to app URLs
- [ ] Unsubscribe link included
- [ ] Development mode logs emails

## Testing Checklist

### Unit Tests

- [ ] Email template rendering
- [ ] HTML escaping in templates
- [ ] Date formatting

### Integration Tests

- [ ] Email sends successfully
- [ ] All template variables populated
- [ ] Links are correct

### Manual Testing

1. Trigger each email type
2. Check rendering in email clients (Gmail, Outlook, Apple Mail)
3. Check mobile rendering
4. Verify all links work
5. Test with special characters in names/titles

## Email Preview Examples

### Signing Request
```
Subject: Signature requested: Artist Management Agreement

[Aermuse header]

Hello John Doe,

**Jane Smith** has requested your signature on a contract.

┌─────────────────────────────────────┐
│ Artist Management Agreement          │
│                                       │
│ "Please review and sign at your       │
│ earliest convenience."                │
└─────────────────────────────────────┘

        [ Review & Sign ]

This request expires on Friday, January 31, 2025

[Footer]
```

### Document Completed
```
Subject: Fully signed: Artist Management Agreement

[Aermuse header]

Contract fully signed!

Hi John Doe, all parties have signed the contract.
A copy has been sent to everyone.

┌─────────────────────────────────────┐
│ Artist Management Agreement          │
│ ✓ Fully executed                     │
└─────────────────────────────────────┘

        [ Download Signed PDF ]

This signed document is now stored securely
in your Aermuse account.

[Footer]
```

## Related Documents

- [Epic 4 Tech Spec](./tech-spec-epic-4.md)
- [Story 4.4: Signature Request API](./4-4-signature-request-api.md)
- [Story 4.5: Webhook Handler](./4-5-webhook-handler.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Set up email service infrastructure**
  - [ ] Create `server/services/email/index.ts`
  - [ ] Configure nodemailer with SMTP settings
  - [ ] Implement getTransporter with dev mode fallback
  - [ ] Add sendEmail wrapper function
  - [ ] Implement stripHtml utility

- [ ] **Task 2: Create base email template**
  - [ ] Create `server/services/email/templates.ts`
  - [ ] Design responsive HTML email template
  - [ ] Add Aermuse branding with burgundy color scheme
  - [ ] Create button helper function
  - [ ] Create infoBox helper function
  - [ ] Add formatDate utility

- [ ] **Task 3: Implement signing request email**
  - [ ] Create `server/services/email/signing.ts`
  - [ ] Implement sendSigningRequestEmail function
  - [ ] Include contract title, initiator name, and message
  - [ ] Add prominent "Sign Now" button with signing URL
  - [ ] Display expiration date if set

- [ ] **Task 4: Implement signing reminder email**
  - [ ] Implement sendSigningReminderEmail function
  - [ ] Create friendly reminder message
  - [ ] Include signing URL and expiration warning
  - [ ] Test reminder email formatting

- [ ] **Task 5: Implement signature confirmation email**
  - [ ] Implement sendSignatureConfirmedEmail function
  - [ ] Thank signer for completing signature
  - [ ] Notify about final PDF delivery when complete

- [ ] **Task 6: Implement progress notification emails**
  - [ ] Implement sendSignatureNotificationToInitiator function
  - [ ] Show signed count vs total count
  - [ ] Add visual progress bar
  - [ ] Include link to view status

- [ ] **Task 7: Implement document completed email**
  - [ ] Implement sendDocumentCompletedEmail function
  - [ ] Celebrate completion for all parties
  - [ ] Include download link for signed PDF
  - [ ] Send to all unique email addresses (dedupe)

- [ ] **Task 8: Add cancellation email template**
  - [ ] Implement sendRequestCancelledEmail function
  - [ ] Notify signatories of cancellation
  - [ ] Explain links are no longer valid

- [ ] **Task 9: Test email rendering across clients**
  - [ ] Test in Gmail web and mobile
  - [ ] Test in Outlook desktop and web
  - [ ] Test in Apple Mail
  - [ ] Verify all links work correctly
  - [ ] Test with special characters in names

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
