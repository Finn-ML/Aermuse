# Story 5.6: Billing Dashboard

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.6 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Billing Dashboard |
| **Priority** | P1 - High |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** subscribed user
**I want** to view my billing information
**So that** I can understand my subscription status

## Context

Users need a dedicated billing page within settings to see their current subscription status, when it renews, payment method info, and access to invoice history. This page also provides entry points to manage subscription (via Customer Portal).

**Dependencies:**
- Story 5.2 (Subscription Data Model)
- Story 5.5 (Stripe Webhook Handler)

## Acceptance Criteria

- [ ] **AC-1:** Billing settings page at `/settings/billing`
- [ ] **AC-2:** Show current plan (Free or Premium)
- [ ] **AC-3:** Show subscription status
- [ ] **AC-4:** Show next billing date (if subscribed)
- [ ] **AC-5:** Show if cancellation is pending
- [ ] **AC-6:** "Manage Subscription" button links to Customer Portal
- [ ] **AC-7:** "Upgrade" button for free users
- [ ] **AC-8:** Show days remaining in billing period
- [ ] **AC-9:** Invoice history link/section

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/settings/Billing.tsx` | New: Billing page |
| `client/src/components/billing/SubscriptionCard.tsx` | New: Status card |
| `client/src/components/billing/BillingActions.tsx` | New: Action buttons |
| `server/routes/billing.ts` | Add billing info endpoint |

### Implementation

#### Billing Info API

```typescript
// server/routes/billing.ts - Add to existing file

// GET /api/billing/info
router.get('/info', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionPriceId: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
    const periodEnd = user.subscriptionCurrentPeriodEnd;

    // Calculate tier and access
    const { hasPremiumAccess, getSubscriptionTier, getDaysRemaining } = await import(
      '../services/subscription'
    );

    const hasAccess = hasPremiumAccess(status, periodEnd);
    const tier = getSubscriptionTier(status, periodEnd);
    const daysRemaining = getDaysRemaining(periodEnd);

    res.json({
      tier,
      status,
      hasAccess,
      hasCustomer: !!user.stripeCustomerId,
      hasSubscription: !!user.stripeSubscriptionId,
      currentPeriodEnd: periodEnd?.toISOString() || null,
      cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd || false,
      daysRemaining,
      priceId: user.subscriptionPriceId,
    });
  } catch (error) {
    console.error('[BILLING] Get info error:', error);
    res.status(500).json({ error: 'Failed to get billing info' });
  }
});
```

#### Billing Page

```tsx
// client/src/pages/settings/Billing.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { SubscriptionCard } from '../../components/billing/SubscriptionCard';
import { BillingActions } from '../../components/billing/BillingActions';

interface BillingInfo {
  tier: 'free' | 'premium';
  status: string;
  hasAccess: boolean;
  hasCustomer: boolean;
  hasSubscription: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
  priceId: string | null;
}

export function Billing() {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/info', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load billing information');
      }

      const data = await response.json();
      setBillingInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <AlertCircle className="h-5 w-5 inline mr-2" />
        {error}
      </div>
    );
  }

  if (!billingInfo) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>

      {/* Current Plan */}
      <SubscriptionCard billingInfo={billingInfo} />

      {/* Actions */}
      <BillingActions
        billingInfo={billingInfo}
        onRefresh={fetchBillingInfo}
      />

      {/* Cancellation Warning */}
      {billingInfo.cancelAtPeriodEnd && billingInfo.daysRemaining !== null && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Subscription Ending</p>
              <p className="text-yellow-700 text-sm mt-1">
                Your subscription will end in {billingInfo.daysRemaining} days.
                You'll continue to have access until then.
              </p>
              <Link
                to="/settings/billing/reactivate"
                className="text-sm text-burgundy hover:underline mt-2 inline-block"
              >
                Change your mind? Reactivate subscription
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Invoice History Link */}
      {billingInfo.hasCustomer && (
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Invoice History
          </h2>
          <p className="text-gray-600 mb-4">
            View and download your past invoices through the Stripe Customer Portal.
          </p>
          <Link
            to="/settings/billing/portal"
            className="inline-flex items-center gap-2 text-burgundy hover:underline"
          >
            View Invoice History
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
```

#### Subscription Card

```tsx
// client/src/components/billing/SubscriptionCard.tsx
import { CreditCard, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  billingInfo: {
    tier: 'free' | 'premium';
    status: string;
    hasAccess: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    daysRemaining: number | null;
  };
}

export function SubscriptionCard({ billingInfo }: Props) {
  const isPremium = billingInfo.tier === 'premium';
  const statusDisplay = getStatusDisplay(billingInfo.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-6 w-6 text-burgundy" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isPremium ? 'Aermuse Premium' : 'Free Plan'}
            </h2>
          </div>

          {isPremium && (
            <p className="text-2xl font-bold text-gray-900">
              £9<span className="text-base font-normal text-gray-500">/month</span>
            </p>
          )}
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.className}`}>
          <statusDisplay.icon className="h-4 w-4 inline mr-1" />
          {statusDisplay.label}
        </div>
      </div>

      {/* Details */}
      {isPremium && billingInfo.currentPeriodEnd && (
        <div className="mt-6 pt-4 border-t space-y-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {billingInfo.cancelAtPeriodEnd ? 'Access until' : 'Next billing date'}:{' '}
              <strong>
                {new Date(billingInfo.currentPeriodEnd).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </span>
          </div>

          {billingInfo.daysRemaining !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{billingInfo.daysRemaining} days remaining</span>
            </div>
          )}
        </div>
      )}

      {/* Free tier info */}
      {!isPremium && (
        <div className="mt-4 text-gray-600">
          <p>Limited to 3 contracts. Upgrade to Premium for:</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Unlimited contracts</li>
            <li>• AI contract analysis</li>
            <li>• E-signing capabilities</li>
            <li>• Professional templates</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function getStatusDisplay(status: string) {
  const displays: Record<string, { label: string; className: string; icon: any }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
      icon: CheckCircle,
    },
    trialing: {
      label: 'Trial',
      className: 'bg-blue-100 text-blue-800',
      icon: Clock,
    },
    past_due: {
      label: 'Past Due',
      className: 'bg-red-100 text-red-800',
      icon: AlertCircle,
    },
    canceled: {
      label: 'Canceled',
      className: 'bg-gray-100 text-gray-800',
      icon: AlertCircle,
    },
    none: {
      label: 'Free',
      className: 'bg-gray-100 text-gray-600',
      icon: CreditCard,
    },
  };

  return displays[status] || displays.none;
}
```

#### Billing Actions

```tsx
// client/src/components/billing/BillingActions.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  billingInfo: {
    tier: 'free' | 'premium';
    hasCustomer: boolean;
    hasSubscription: boolean;
  };
  onRefresh: () => void;
}

export function BillingActions({ billingInfo, onRefresh }: Props) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremium = billingInfo.tier === 'premium';

  return (
    <div className="mt-6 flex flex-wrap gap-4">
      {isPremium && billingInfo.hasCustomer ? (
        <button
          onClick={handleManageSubscription}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          Manage Subscription
        </button>
      ) : (
        <button
          onClick={() => navigate('/checkout')}
          className="flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Premium
        </button>
      )}
    </div>
  );
}
```

#### Route Configuration

```tsx
// client/src/App.tsx or settings layout
import { Billing } from './pages/settings/Billing';

// In settings routes:
<Route path="/settings/billing" element={<Billing />} />
```

## Definition of Done

- [ ] Billing page accessible at /settings/billing
- [ ] Shows correct current plan
- [ ] Shows subscription status with icon
- [ ] Shows billing date for premium
- [ ] Shows days remaining
- [ ] Cancellation warning displayed when applicable
- [ ] Manage Subscription button works
- [ ] Upgrade button for free users
- [ ] Invoice history link present

## Testing Checklist

### Unit Tests

- [ ] getStatusDisplay returns correct values
- [ ] Date formatting works correctly
- [ ] Days remaining calculation

### Integration Tests

- [ ] Billing info API returns correct data
- [ ] Different subscription statuses displayed correctly

### Visual Tests

- [ ] Free user view
- [ ] Active premium view
- [ ] Canceled with access view
- [ ] Past due view

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.7: Stripe Customer Portal](./5-7-stripe-customer-portal.md)
- [Story 5.2: Subscription Data Model](./5-2-subscription-data-model.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Create billing info API endpoint**
  - [ ] Add GET /api/billing/info route to server/routes/billing.ts
  - [ ] Query user subscription fields from database
  - [ ] Calculate tier, hasAccess, and daysRemaining
  - [ ] Return formatted billing info object
  - [ ] Handle missing user error

- [ ] **Task 2: Build Billing page component**
  - [ ] Create client/src/pages/settings/Billing.tsx
  - [ ] Set up state for billingInfo, loading, error
  - [ ] Implement fetchBillingInfo function
  - [ ] Add useEffect to load data on mount
  - [ ] Render loading spinner
  - [ ] Render error state
  - [ ] Display SubscriptionCard component
  - [ ] Display BillingActions component
  - [ ] Add cancellation warning section

- [ ] **Task 3: Build SubscriptionCard component**
  - [ ] Create client/src/components/billing/SubscriptionCard.tsx
  - [ ] Display tier name and price
  - [ ] Show subscription status badge with icon
  - [ ] Display next billing date
  - [ ] Show days remaining in billing period
  - [ ] Add free tier feature list
  - [ ] Implement getStatusDisplay function

- [ ] **Task 4: Build BillingActions component**
  - [ ] Create client/src/components/billing/BillingActions.tsx
  - [ ] Implement handleManageSubscription function
  - [ ] Call /api/billing/portal endpoint
  - [ ] Redirect to Stripe portal
  - [ ] Show "Manage Subscription" for premium users
  - [ ] Show "Upgrade to Premium" for free users
  - [ ] Add loading state during portal redirect

- [ ] **Task 5: Add cancellation warning banner**
  - [ ] Check if cancelAtPeriodEnd is true
  - [ ] Display yellow warning box
  - [ ] Show days remaining
  - [ ] Add link to reactivate subscription

- [ ] **Task 6: Add invoice history link**
  - [ ] Check if user has customer ID
  - [ ] Display invoice history section
  - [ ] Add link to billing portal
  - [ ] Add link to /settings/billing/invoices

- [ ] **Task 7: Add route configuration**
  - [ ] Import Billing component
  - [ ] Add /settings/billing route
  - [ ] Test navigation

- [ ] **Task 8: Testing**
  - [ ] Test billing info API returns correct data
  - [ ] Test as free user (shows upgrade option)
  - [ ] Test as active premium user
  - [ ] Test as canceled user with access
  - [ ] Test as past_due user
  - [ ] Verify status badges display correctly
  - [ ] Test date and days remaining formatting
