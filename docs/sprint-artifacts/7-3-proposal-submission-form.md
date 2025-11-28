# Story 7.3: Proposal Submission Form

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 7.3 |
| **Epic** | Epic 7: Landing Page Enhancements |
| **Title** | Proposal Submission Form |
| **Priority** | P2 - Medium |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** visitor
**I want** to fill out a proposal form
**So that** the artist knows about my interest

## Context

The proposal form allows external parties to submit business inquiries to artists. It should be easy to use, validate inputs properly, and not require an account to submit.

**Dependencies:**
- Story 7.1 (Proposal Data Model)
- Story 7.2 (Send Proposal Button)

## Acceptance Criteria

- [ ] **AC-1:** Modal form with all required fields
- [ ] **AC-2:** Fields: Name (required), Email (required), Company (optional), Proposal type (required), Message (required)
- [ ] **AC-3:** Proposal types: Collaboration, Licensing, Booking, Recording, Distribution, Other
- [ ] **AC-4:** Message field with 1000 character limit and counter
- [ ] **AC-5:** Client-side form validation
- [ ] **AC-6:** Submit button with loading state
- [ ] **AC-7:** Success confirmation message
- [ ] **AC-8:** No account required to submit
- [ ] **AC-9:** Rate limiting (5 per hour per IP)

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/components/landing/ProposalFormModal.tsx` | New: Form modal |
| `server/routes/proposals.ts` | New: Proposal API |
| `server/middleware/rateLimiter.ts` | Add: Proposal rate limiter |

### Implementation

#### Proposal Form Modal

```tsx
// client/src/components/landing/ProposalFormModal.tsx
import { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  landingPageId: string;
  artistName: string;
}

const PROPOSAL_TYPES = [
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'booking', label: 'Booking' },
  { value: 'recording', label: 'Recording' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'other', label: 'Other' },
];

const MAX_MESSAGE_LENGTH = 1000;

export function ProposalFormModal({ isOpen, onClose, landingPageId, artistName }: Props) {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    senderCompany: '',
    proposalType: 'collaboration',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.senderName.trim()) {
      newErrors.senderName = 'Name is required';
    }

    if (!formData.senderEmail.trim()) {
      newErrors.senderEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landingPageId,
          ...formData,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to submit proposal');
        setSubmitStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      senderName: '',
      senderEmail: '',
      senderCompany: '',
      proposalType: 'collaboration',
      message: '',
    });
    setErrors({});
    setSubmitStatus('idle');
    setErrorMessage('');
    onClose();
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Proposal Sent!
          </h2>
          <p className="text-gray-600 mb-6">
            Your proposal has been sent to {artistName}. They'll receive an email
            notification and can respond to you directly.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-burgundy-600 hover:bg-burgundy-700 text-white font-medium rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            Send Proposal to {artistName}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error banner */}
          {submitStatus === 'error' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500 ${
                errors.senderName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Smith"
            />
            {errors.senderName && (
              <p className="mt-1 text-sm text-red-500">{errors.senderName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500 ${
                errors.senderEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
            {errors.senderEmail && (
              <p className="mt-1 text-sm text-red-500">{errors.senderEmail}</p>
            )}
          </div>

          {/* Company (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company / Organization
            </label>
            <input
              type="text"
              value={formData.senderCompany}
              onChange={(e) => setFormData({ ...formData, senderCompany: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              placeholder="Acme Records (optional)"
            />
          </div>

          {/* Proposal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposal Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.proposalType}
              onChange={(e) => setFormData({ ...formData, proposalType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            >
              {PROPOSAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500 resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe your proposal..."
            />
            <div className="flex justify-between mt-1">
              {errors.message ? (
                <p className="text-sm text-red-500">{errors.message}</p>
              ) : (
                <span />
              )}
              <span
                className={`text-sm ${
                  formData.message.length > MAX_MESSAGE_LENGTH
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {formData.message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-burgundy-600 hover:bg-burgundy-700 disabled:bg-burgundy-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Proposal
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By submitting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
```

#### Proposal API Endpoint

```typescript
// server/routes/proposals.ts
import { Router } from 'express';
import { db } from '../db';
import { proposals } from '../db/schema/proposals';
import { landingPages } from '../db/schema/landingPages';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendProposalNotification } from '../services/email';
import { proposalRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const proposalSchema = z.object({
  landingPageId: z.string().uuid(),
  senderName: z.string().min(1).max(255),
  senderEmail: z.string().email().max(255),
  senderCompany: z.string().max(255).optional(),
  proposalType: z.enum(['collaboration', 'licensing', 'booking', 'recording', 'distribution', 'other']),
  message: z.string().min(1).max(1000),
});

// POST /api/proposals - Submit new proposal (public, rate limited)
router.post('/', proposalRateLimiter, async (req, res) => {
  try {
    const parsed = proposalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { landingPageId, senderName, senderEmail, senderCompany, proposalType, message } = parsed.data;

    // Find landing page and owner
    const landingPage = await db.query.landingPages.findFirst({
      where: eq(landingPages.id, landingPageId),
      with: {
        user: {
          columns: { id: true, email: true, name: true },
        },
      },
    });

    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    if (!landingPage.isPublished) {
      return res.status(400).json({ error: 'This page is not accepting proposals' });
    }

    // Create proposal
    const [proposal] = await db
      .insert(proposals)
      .values({
        landingPageId,
        userId: landingPage.userId,
        senderName,
        senderEmail,
        senderCompany: senderCompany || null,
        proposalType,
        message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      })
      .returning();

    // Send notification email to artist
    await sendProposalNotification({
      artistEmail: landingPage.user.email,
      artistName: landingPage.user.name,
      landingPageTitle: landingPage.title,
      senderName,
      senderEmail,
      senderCompany,
      proposalType,
      message,
      proposalId: proposal.id,
    });

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
    });
  } catch (error) {
    console.error('[PROPOSALS] Submit error:', error);
    res.status(500).json({ error: 'Failed to submit proposal' });
  }
});

export default router;
```

#### Rate Limiter

```typescript
// server/middleware/rateLimiter.ts (add to existing)
import rateLimit from 'express-rate-limit';

export const proposalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 proposals per hour per IP
  message: {
    error: 'Too many proposals submitted. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});
```

## Definition of Done

- [ ] Form renders in modal
- [ ] All validations work
- [ ] Successful submission creates proposal
- [ ] Rate limiting prevents spam
- [ ] Success message displays
- [ ] Form clears on close

## Testing Checklist

### Unit Tests

- [ ] Form validation logic
- [ ] Character counter
- [ ] Email format validation

### Integration Tests

- [ ] POST /api/proposals creates record
- [ ] Rate limiter blocks excess requests
- [ ] Invalid landing page returns 404

### E2E Tests

- [ ] Complete form submission flow
- [ ] Validation error display
- [ ] Success state display

## Related Documents

- [Epic 7 Tech Spec](./tech-spec-epic-7.md)
- [Story 7.4: Proposal Notification](./7-4-proposal-notification.md)
