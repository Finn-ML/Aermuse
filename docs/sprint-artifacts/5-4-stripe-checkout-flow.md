# Story 5.4: Stripe Checkout Flow

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.4 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Stripe Checkout Flow |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** user
**I want** to subscribe via Stripe Checkout
**So that** I can get premium access

## Context

This story implements the checkout flow using Stripe Checkout (hosted payment page). When users click "Get Premium", we create a checkout session and redirect them to Stripe's hosted page. After payment, they're redirected back to Aermuse.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup)
- Story 5.2 (Subscription Data Model)
- Story 5.3 (Pricing Page)

## Acceptance Criteria

- [ ] **AC-1:** API endpoint creates checkout session
- [ ] **AC-2:** User redirected to Stripe Checkout page
- [ ] **AC-3:** Success URL returns to dashboard with confirmation
- [ ] **AC-4:** Cancel URL returns to pricing page
- [ ] **AC-5:** Existing Stripe customer ID used if available
- [ ] **AC-6:** New customer created if needed
- [ ] **AC-7:** User ID attached to session metadata
- [ ] **AC-8:** Loading state during redirect
- [ ] **AC-9:** Error handling for failed session creation

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/billing.ts` | New: Billing API routes |
| `client/src/pages/Checkout.tsx` | New: Checkout initiation page |
| `client/src/pages/CheckoutSuccess.tsx` | New: Success page |
| `client/src/hooks/useCheckout.ts` | New: Checkout hook |
| `server/index.ts` | Mount billing routes |

### Implementation

#### Billing API Routes

```typescript
// server/routes/billing.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import {
  createCheckoutSession,
  createCustomer,
  stripeConfig,
} from '../services/stripe';

const router = Router();

// ============================================
// CREATE CHECKOUT SESSION
// ============================================

// POST /api/billing/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already subscribed
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
      return res.status(400).json({
        error: 'You already have an active subscription',
        redirect: '/settings/billing',
      });
    }

    let customerId = user.stripeCustomerId;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await createCustomer(user.email, {
        userId: user.id,
        name: user.name,
      });
      customerId = customer.id;

      // Save customer ID to user
      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      userId: user.id,
      successUrl: `${stripeConfig.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${stripeConfig.appUrl}/pricing?canceled=true`,
    });

    console.log(`[BILLING] Checkout session created: ${session.id} for user ${userId}`);

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[BILLING] Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ============================================
// VERIFY CHECKOUT SUCCESS
// ============================================

// GET /api/billing/checkout/verify/:sessionId
router.get('/checkout/verify/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId!;

    // Retrieve session from Stripe
    const stripe = (await import('../services/stripe')).stripe;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session belongs to this user
    if (session.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Session does not belong to this user' });
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        status: session.payment_status,
        message: 'Payment not completed',
      });
    }

    res.json({
      success: true,
      status: 'paid',
      subscriptionId: session.subscription,
      customerId: session.customer,
    });
  } catch (error) {
    console.error('[BILLING] Verify checkout error:', error);
    res.status(500).json({ error: 'Failed to verify checkout session' });
  }
});

// ============================================
// GET SUBSCRIPTION STATUS
// ============================================

// GET /api/billing/subscription
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { getUserSubscription } = await import('../services/subscription');

    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    console.error('[BILLING] Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

export default router;
```

#### Mount Routes

```typescript
// server/index.ts
import billingRoutes from './routes/billing';

// Mount routes
app.use('/api/billing', billingRoutes);
```

#### Checkout Page

```tsx
// client/src/pages/Checkout.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }

    initiateCheckout();
  }, [user]);

  const initiateCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.redirect) {
          navigate(data.redirect);
          return;
        }
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Checkout Error
          </h1>

          <p className="text-gray-600 mb-6">{error}</p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Back to Pricing
            </button>
            <button
              onClick={initiateCheckout}
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="h-8 w-8 text-burgundy" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to Checkout
        </h1>

        <p className="text-gray-600 mb-6">
          Please wait while we redirect you to our secure payment page...
        </p>

        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading checkout...</span>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Powered by Stripe. Your payment is secure.
        </p>
      </div>
    </div>
  );
}
```

#### Checkout Success Page

```tsx
// client/src/pages/CheckoutSuccess.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type VerificationState = 'verifying' | 'success' | 'error';

export function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<VerificationState>('verifying');
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setState('error');
      return;
    }

    verifyCheckout();
  }, [sessionId]);

  const verifyCheckout = async () => {
    try {
      const response = await fetch(`/api/billing/checkout/verify/${sessionId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.success) {
        // Refresh user data to get updated subscription
        await refreshUser();
        setState('success');
      } else {
        throw new Error(data.message || 'Payment not completed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setState('error');
    }
  };

  if (state === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-burgundy animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verification Issue
          </h1>

          <p className="text-gray-600 mb-6">
            {error || 'There was an issue verifying your payment.'}
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Don't worry - if your payment was successful, your subscription will
            be activated shortly. Check your email for confirmation.
          </p>

          <Link
            to="/dashboard"
            className="inline-block px-6 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy/5 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Premium!
        </h1>

        <p className="text-gray-600 mb-8">
          Your subscription is now active. You have full access to all Aermuse features.
        </p>

        <div className="bg-burgundy/5 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-burgundy mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">What's Unlocked</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>AI Contract Analysis</li>
            <li>E-Signing with DocuSeal</li>
            <li>Professional Templates</li>
            <li>Unlimited Contracts</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full px-6 py-3 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark font-medium"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/contracts/new"
            className="w-full px-6 py-3 border border-burgundy text-burgundy rounded-lg hover:bg-burgundy/5 font-medium"
          >
            Analyze Your First Contract
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### Checkout Hook

```typescript
// client/src/hooks/useCheckout.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useCheckout() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      setIsLoading(false);
    }
  };

  return {
    startCheckout,
    isLoading,
    error,
  };
}
```

#### Route Configuration

```tsx
// client/src/App.tsx - Add routes
import { Checkout } from './pages/Checkout';
import { CheckoutSuccess } from './pages/CheckoutSuccess';

// In routes:
<Route path="/checkout" element={<Checkout />} />
<Route path="/checkout/success" element={<CheckoutSuccess />} />
```

## Definition of Done

- [ ] Checkout session created via API
- [ ] Redirect to Stripe Checkout works
- [ ] Success page verifies payment
- [ ] User subscription updated after success
- [ ] Cancel redirects to pricing
- [ ] Error handling in place
- [ ] Loading states implemented

## Testing Checklist

### Unit Tests

- [ ] useCheckout hook states
- [ ] Error handling

### Integration Tests

- [ ] Create checkout session
- [ ] Verify checkout session
- [ ] Customer creation

### E2E Tests

- [ ] Full checkout flow with test card
- [ ] Cancel and return to pricing
- [ ] Success page displays correctly

### Manual Testing

1. Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Start checkout
3. Complete with test card `4242 4242 4242 4242`
4. Verify success page
5. Check subscription status

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.3: Pricing Page](./5-3-pricing-page.md)
- [Story 5.5: Stripe Webhook Handler](./5-5-stripe-webhook-handler.md)
