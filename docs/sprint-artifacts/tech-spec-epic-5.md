# Epic 5: Subscription & Billing - Technical Specification

## Overview

This specification details the Stripe integration for subscription billing. Aermuse uses a simple single-tier model at £9/month to unlock premium features including AI Attorney and unlimited e-signing.

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUBSCRIPTION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  Pricing     │───▶│   Stripe     │───▶│   Success    │                   │
│  │   Page       │    │  Checkout    │    │   Redirect   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                             │                                                │
│                             ▼                                                │
│                      ┌──────────────┐                                       │
│                      │   Webhook    │                                       │
│                      │   Handler    │                                       │
│                      └──────┬───────┘                                       │
│                             │                                                │
│                             ▼                                                │
│                      ┌──────────────┐    ┌──────────────┐                   │
│                      │   Update     │───▶│   Feature    │                   │
│                      │   User DB    │    │   Access     │                   │
│                      └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Billing Management

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Billing         │────▶│  Stripe Customer │────▶│  Update Payment  │
│  Dashboard       │     │  Portal          │     │  / Cancel        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                │
                                │ Webhook
                                ▼
                         ┌──────────────────┐
                         │  Update User DB  │
                         └──────────────────┘
```

## Stripe Configuration

### Product Setup

Create in Stripe Dashboard:

```
Product: Aermuse Premium
- Name: Aermuse Premium
- Description: Full access to AI Attorney, templates, and e-signing
- Price: £9.00/month (recurring)
- Price ID: price_xxx (store in env)
```

### Environment Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx          # or sk_live_xxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxx     # or pk_live_xxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxx        # Webhook endpoint signing secret

# Stripe Product
STRIPE_PRICE_ID=price_xxx              # Monthly subscription price ID

# URLs
APP_URL=https://aermuse.com            # For redirect URLs
```

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record, grant access |
| `customer.subscription.created` | Update subscription status |
| `customer.subscription.updated` | Update status, period end |
| `customer.subscription.deleted` | Mark as canceled |
| `invoice.payment_succeeded` | Update last payment date |
| `invoice.payment_failed` | Mark as past_due, notify user |
| `customer.updated` | Sync customer data |

## Database Schema

### User Table Updates

```sql
-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(50);
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(50);
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN subscription_price_id VARCHAR(50);
ALTER TABLE users ADD COLUMN subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Index for Stripe lookups
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

### Drizzle Schema

```typescript
// server/db/schema/users.ts (additions)
import { pgTable, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Add to existing users table definition:
export const users = pgTable('users', {
  // ... existing fields ...

  // Stripe subscription fields
  stripeCustomerId: varchar('stripe_customer_id', { length: 50 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 50 }),
  subscriptionStatus: text('subscription_status').default('none'),
  subscriptionPriceId: varchar('subscription_price_id', { length: 50 }),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', { withTimezone: true }),
  subscriptionCancelAtPeriodEnd: boolean('subscription_cancel_at_period_end').default(false),
});

// Subscription status type
export type SubscriptionStatus =
  | 'none'        // Never subscribed
  | 'trialing'    // In trial period (if enabled)
  | 'active'      // Paid and active
  | 'past_due'    // Payment failed, grace period
  | 'canceled'    // Canceled, access until period end
  | 'unpaid'      // Payment failed, access revoked
  | 'incomplete'  // Initial payment pending
  | 'incomplete_expired'; // Initial payment failed
```

### Payment History Table (Optional)

```sql
CREATE TABLE payment_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,  -- In pence
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL,     -- paid, open, void, uncollectible
  invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);
```

## Stripe Service

### Service Implementation

```typescript
// server/services/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export { stripe };

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Check if user already has a customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.stripeCustomerId) {
    return stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Save customer ID to user
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer;
}

// ============================================
// CHECKOUT SESSION
// ============================================

export async function createCheckoutSession(
  userId: string,
  email: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const customer = await getOrCreateCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId,
      },
    },
    metadata: {
      userId,
    },
  });

  return session;
}

// ============================================
// CUSTOMER PORTAL
// ============================================

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// ============================================
// INVOICE MANAGEMENT
// ============================================

export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  return invoices.data;
}

// ============================================
// WEBHOOK VERIFICATION
// ============================================

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
```

## Feature Access Control

### Subscription Check Middleware

```typescript
// server/middleware/subscription.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export function requireSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check subscription status in session (cached)
  if (req.session.subscriptionStatus === 'active') {
    return next();
  }

  // If canceled, check if still in period
  if (req.session.subscriptionStatus === 'canceled') {
    const periodEnd = new Date(req.session.subscriptionPeriodEnd);
    if (periodEnd > new Date()) {
      return next();
    }
  }

  // No valid subscription
  return res.status(403).json({
    error: 'Subscription required',
    code: 'SUBSCRIPTION_REQUIRED',
    upgradeUrl: '/pricing',
  });
}

// Check subscription status helper
export async function checkSubscriptionAccess(userId: string): Promise<{
  hasAccess: boolean;
  status: string;
  expiresAt?: Date;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionCancelAtPeriodEnd: true,
    },
  });

  if (!user) {
    return { hasAccess: false, status: 'none' };
  }

  const status = user.subscriptionStatus || 'none';
  const periodEnd = user.subscriptionCurrentPeriodEnd;

  // Active subscription
  if (status === 'active' || status === 'trialing') {
    return {
      hasAccess: true,
      status,
      expiresAt: periodEnd || undefined,
    };
  }

  // Canceled but still in period
  if (status === 'canceled' && periodEnd && new Date(periodEnd) > new Date()) {
    return {
      hasAccess: true,
      status: 'canceled',
      expiresAt: periodEnd,
    };
  }

  return { hasAccess: false, status };
}

// Update session with subscription data
export async function syncSubscriptionToSession(
  req: Request,
  userId: string
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (user) {
    req.session.subscriptionStatus = user.subscriptionStatus;
    req.session.subscriptionPeriodEnd = user.subscriptionCurrentPeriodEnd?.toISOString();
  }
}
```

### Feature Gate Component (Frontend)

```typescript
// client/src/components/SubscriptionGate.tsx
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface Props {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
}

export function SubscriptionGate({ children, feature, fallback }: Props) {
  const { hasAccess, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-32" />;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="bg-gradient-to-br from-burgundy/5 to-burgundy/10 rounded-lg p-6 text-center">
      <div className="w-12 h-12 bg-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="h-6 w-6 text-burgundy" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        {feature ? `${feature} requires Premium` : 'Premium Feature'}
      </h3>
      <p className="text-gray-600 mb-4">
        Upgrade to Aermuse Premium to unlock this feature.
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy-dark"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade for £9/month
      </Link>
    </div>
  );
}
```

## Pricing Tiers

### Free vs Premium

| Feature | Free | Premium (£9/mo) |
|---------|------|-----------------|
| Account & Profile | ✓ | ✓ |
| Contract Storage | 3 contracts | Unlimited |
| Contract Templates | View only | Full access |
| AI Contract Analysis | ✗ | ✓ |
| E-Signing | ✗ | ✓ |
| PDF Export | ✗ | ✓ |
| Priority Support | ✗ | ✓ |

### Implementation Constants

```typescript
// shared/constants/subscription.ts
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
} as const;

export const FREE_TIER_LIMITS = {
  maxContracts: 3,
  aiAnalysis: false,
  eSigning: false,
  templates: false,
  pdfExport: false,
};

export const PREMIUM_FEATURES = [
  { name: 'AI Contract Analysis', description: 'Get instant AI-powered contract reviews' },
  { name: 'All Contract Templates', description: 'Access professional music industry templates' },
  { name: 'Unlimited E-Signing', description: 'Send contracts for digital signature' },
  { name: 'Unlimited Storage', description: 'Store all your contracts securely' },
  { name: 'PDF Export', description: 'Download contracts as professional PDFs' },
  { name: 'Priority Support', description: 'Get help when you need it' },
];

export const SUBSCRIPTION_PRICE = {
  amount: 900, // pence
  currency: 'gbp',
  interval: 'month',
  displayPrice: '£9',
};
```

## Webhook Event Handlers

```typescript
// server/services/stripeWebhooks.ts
import Stripe from 'stripe';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('[STRIPE] No userId in checkout session metadata');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPriceId: subscription.items.data[0]?.price.id,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
    .where(eq(users.id, userId));

  console.log(`[STRIPE] Subscription activated for user ${userId}`);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error('[STRIPE] No user found for customer', customerId);
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
    .where(eq(users.id, user.id));

  console.log(`[STRIPE] Subscription updated for user ${user.id}: ${subscription.status}`);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  await db
    .update(users)
    .set({
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
    })
    .where(eq(users.stripeCustomerId, customerId));

  console.log(`[STRIPE] Subscription deleted for customer ${customerId}`);
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  await db
    .update(users)
    .set({
      subscriptionStatus: 'past_due',
    })
    .where(eq(users.stripeCustomerId, customerId));

  // TODO: Send payment failed email

  console.log(`[STRIPE] Payment failed for customer ${customerId}`);
}
```

## Security Considerations

1. **Webhook Verification** - Always verify Stripe webhook signatures
2. **Customer Portal** - Use Stripe's hosted portal for PCI compliance
3. **Checkout** - Use Stripe Checkout, never handle card details
4. **Idempotency** - Handle duplicate webhook events gracefully
5. **Logging** - Log all subscription events for auditing
6. **Error Handling** - Graceful degradation on Stripe API errors

## Testing

### Test Mode

- Use `sk_test_` and `pk_test_` keys for development
- Use Stripe test card numbers: `4242 4242 4242 4242`
- Test webhook events via Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Test Scenarios

1. New subscription via checkout
2. Subscription renewal (webhook)
3. Payment failure (use `4000 0000 0000 9995`)
4. Cancellation via portal
5. Reactivation after cancellation
6. Access check during grace period
