# Story 5.7: Stripe Customer Portal

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.7 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Stripe Customer Portal |
| **Priority** | P1 - High |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** subscribed user
**I want** to manage my subscription and payment methods
**So that** I can update billing details or cancel

## Context

Stripe's Customer Portal provides a hosted UI for subscription management, including updating payment methods, viewing invoices, and canceling subscriptions. This reduces our implementation burden while providing a secure, compliant billing experience.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup) - Portal configured in Stripe Dashboard
- Story 5.2 (Subscription Data Model)
- Story 5.6 (Billing Dashboard)

## Acceptance Criteria

- [ ] **AC-1:** API endpoint creates portal session
- [ ] **AC-2:** User redirected to Stripe Customer Portal
- [ ] **AC-3:** Portal configured for subscription management
- [ ] **AC-4:** Return URL brings user back to billing page
- [ ] **AC-5:** Portal allows payment method updates
- [ ] **AC-6:** Portal shows invoice history
- [ ] **AC-7:** Portal allows subscription cancellation
- [ ] **AC-8:** Error handling for users without Stripe customer

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/billing.ts` | Add portal session endpoint |
| `client/src/pages/settings/BillingPortal.tsx` | Portal redirect page |

### Implementation

#### Portal Session API

```typescript
// server/routes/billing.ts - Add to existing file

// POST /api/billing/portal
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    // Get user with Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        error: 'No billing account found',
        message: 'You need to subscribe first to access billing management.',
      });
    }

    // Create portal session
    const { createPortalSession, stripeConfig } = await import('../services/stripe');

    const session = await createPortalSession(
      user.stripeCustomerId,
      `${stripeConfig.appUrl}/settings/billing`
    );

    console.log(`[BILLING] Portal session created for user ${userId}`);

    res.json({
      url: session.url,
    });
  } catch (error) {
    console.error('[BILLING] Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});
```

#### Portal Redirect Page

```tsx
// client/src/pages/settings/BillingPortal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

export function BillingPortal() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    openPortal();
  }, []);

  const openPortal = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to open portal');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Open Billing Portal
          </h1>

          <p className="text-gray-600 mb-6">{error}</p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/settings/billing')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Back to Billing
            </button>
            <button
              onClick={openPortal}
              className="px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ExternalLink className="h-8 w-8 text-burgundy" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Opening Billing Portal
        </h1>

        <p className="text-gray-600 mb-6">
          Redirecting you to the secure Stripe billing portal...
        </p>

        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Powered by Stripe
        </p>
      </div>
    </div>
  );
}
```

#### Route Configuration

```tsx
// client/src/App.tsx - Add route
import { BillingPortal } from './pages/settings/BillingPortal';

// In settings routes:
<Route path="/settings/billing/portal" element={<BillingPortal />} />
```

### Stripe Dashboard Configuration

The Customer Portal must be configured in Stripe Dashboard:

1. Go to Settings → Billing → Customer portal
2. Configure the following:

#### Business Information
- Business name: Aermuse
- Support phone/email: Your support contact
- Terms of service link (optional)
- Privacy policy link (optional)

#### Features to Enable
- **Invoices**: Allow viewing and downloading
- **Customer information**: Allow updating (if needed)
- **Payment methods**: Allow adding/updating
- **Subscriptions**: Allow canceling

#### Subscription Cancellation
- Cancellation mode: At end of billing period (recommended)
- Proration behavior: As needed
- Retention flow: Enable to try to retain customers

#### Products
- Subscription updating: Disable (single tier, no upgrades)
- Proration: N/A

#### Links & Redirects
- Default return URL: `{APP_URL}/settings/billing`

### Portal Integration Hook

```typescript
// client/src/hooks/useBillingPortal.ts
import { useState, useCallback } from 'react';

export function useBillingPortal() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to open portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open portal';
      setError(message);
      setIsLoading(false);
    }
  }, []);

  return {
    openPortal,
    isLoading,
    error,
  };
}
```

### Portal Button Component

```tsx
// client/src/components/billing/PortalButton.tsx
import { Loader2, ExternalLink } from 'lucide-react';
import { useBillingPortal } from '../../hooks/useBillingPortal';

interface Props {
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function PortalButton({ variant = 'secondary', className = '' }: Props) {
  const { openPortal, isLoading, error } = useBillingPortal();

  return (
    <>
      <button
        onClick={openPortal}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variant === 'primary'
            ? 'bg-burgundy text-white hover:bg-burgundy-dark'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Manage Billing
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </>
  );
}
```

## Definition of Done

- [ ] Portal session endpoint working
- [ ] Redirect to Stripe portal works
- [ ] Return from portal lands on billing page
- [ ] Portal configured in Stripe Dashboard
- [ ] Users can update payment methods
- [ ] Users can view invoices
- [ ] Users can cancel subscription
- [ ] Error handling for no customer

## Testing Checklist

### Unit Tests

- [ ] useBillingPortal hook states
- [ ] PortalButton renders correctly

### Integration Tests

- [ ] Portal session creation
- [ ] No customer error handling

### Manual Testing

1. Log in as premium user
2. Go to Settings → Billing
3. Click "Manage Subscription"
4. Verify portal opens
5. Test payment method update
6. Test invoice viewing
7. Return to Aermuse
8. Verify landing on billing page

### Edge Cases

- [ ] Free user tries to access portal → Error message
- [ ] User with no Stripe customer → Error message
- [ ] Portal session expires → Create new session

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.6: Billing Dashboard](./5-6-billing-dashboard.md)
- [Story 5.9: Subscription Cancellation Handling](./5-9-subscription-cancellation-handling.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Implement portal session API endpoint**
  - [ ] Add POST /api/billing/portal route to server/routes/billing.ts
  - [ ] Query user to get stripeCustomerId
  - [ ] Validate user has Stripe customer
  - [ ] Call createPortalSession from Stripe service
  - [ ] Return portal URL
  - [ ] Handle error for users without customer

- [ ] **Task 2: Configure Customer Portal in Stripe Dashboard**
  - [ ] Navigate to Settings → Billing → Customer portal
  - [ ] Add business information and branding
  - [ ] Enable invoice viewing and downloading
  - [ ] Enable payment method updates
  - [ ] Enable subscription cancellation
  - [ ] Set cancellation mode to "at end of billing period"
  - [ ] Configure return URL to /settings/billing
  - [ ] Customize portal colors to match Aermuse

- [ ] **Task 3: Build BillingPortal page component**
  - [ ] Create client/src/pages/settings/BillingPortal.tsx
  - [ ] Implement openPortal function in useEffect
  - [ ] Call /api/billing/portal API
  - [ ] Redirect to portal URL
  - [ ] Show loading state during redirect
  - [ ] Display error state with retry option

- [ ] **Task 4: Create useBillingPortal hook**
  - [ ] Create client/src/hooks/useBillingPortal.ts
  - [ ] Implement openPortal function
  - [ ] Manage loading and error states
  - [ ] Return hook interface

- [ ] **Task 5: Build PortalButton component**
  - [ ] Create client/src/components/billing/PortalButton.tsx
  - [ ] Use useBillingPortal hook
  - [ ] Support primary and secondary variants
  - [ ] Show loading spinner when active
  - [ ] Display error message if present
  - [ ] Make reusable across app

- [ ] **Task 6: Add route configuration**
  - [ ] Import BillingPortal component
  - [ ] Add /settings/billing/portal route
  - [ ] Test navigation

- [ ] **Task 7: Testing**
  - [ ] Test portal session creation API
  - [ ] Test as premium user with customer ID
  - [ ] Test as free user without customer (error)
  - [ ] Verify redirect to Stripe portal
  - [ ] Test updating payment method in portal
  - [ ] Test viewing invoices in portal
  - [ ] Test canceling subscription in portal
  - [ ] Verify return URL brings user back
