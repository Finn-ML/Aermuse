# Story 5.1: Stripe Integration Setup

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.1 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Stripe Integration Setup |
| **Priority** | P0 - Critical |
| **Story Points** | 2 |
| **Status** | Drafted |

## User Story

**As a** developer
**I want** to configure Stripe integration
**So that** payments can be processed

## Context

This foundational story sets up the Stripe SDK, configures API keys, creates the product/price in Stripe Dashboard, and establishes the service layer for all payment operations.

**Dependencies:**
- Stripe account created
- No other Aermuse stories required first

## Acceptance Criteria

- [ ] **AC-1:** Stripe SDK installed and configured
- [ ] **AC-2:** API keys stored in environment variables
- [ ] **AC-3:** Test mode working in development
- [ ] **AC-4:** Product "Aermuse Premium" created in Stripe
- [ ] **AC-5:** Price £9/month recurring created in Stripe
- [ ] **AC-6:** Stripe service module with typed methods
- [ ] **AC-7:** Webhook endpoint secret configured
- [ ] **AC-8:** Customer portal configured in Stripe Dashboard

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/services/stripe.ts` | New: Stripe service module |
| `server/services/stripe.types.ts` | New: TypeScript types |
| `package.json` | Add stripe dependency |
| `.env.example` | Add Stripe env vars |

### Implementation

#### Install Stripe SDK

```bash
npm install stripe
```

#### Environment Variables

```bash
# .env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx           # Test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_xxx      # For frontend (if needed)
STRIPE_WEBHOOK_SECRET=whsec_xxx         # Webhook signing secret

# Stripe Product Configuration
STRIPE_PRICE_ID=price_xxx               # Monthly subscription price ID

# Application URL (for redirects)
APP_URL=http://localhost:5173           # Update for production
```

```bash
# .env.example
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID=price_your_price_id_here
APP_URL=http://localhost:5173
```

#### Stripe Service

```typescript
// server/services/stripe.ts
import Stripe from 'stripe';

// Validate required environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!STRIPE_PRICE_ID) {
  console.warn('[STRIPE] STRIPE_PRICE_ID not set - checkout will fail');
}

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export { stripe };

// ============================================
// CONFIGURATION
// ============================================

export const stripeConfig = {
  priceId: STRIPE_PRICE_ID!,
  webhookSecret: STRIPE_WEBHOOK_SECRET!,
  appUrl: APP_URL,
  currency: 'gbp',
  subscriptionMode: 'subscription' as const,
};

// ============================================
// CUSTOMER OPERATIONS
// ============================================

/**
 * Create a new Stripe customer
 */
export async function createCustomer(
  email: string,
  metadata: { userId: string; name?: string }
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name: metadata.name,
    metadata: {
      userId: metadata.userId,
    },
  });

  console.log(`[STRIPE] Customer created: ${customer.id} for user ${metadata.userId}`);
  return customer;
}

/**
 * Retrieve an existing customer
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch (error) {
    if ((error as Stripe.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Update customer details
 */
export async function updateCustomer(
  customerId: string,
  data: { email?: string; name?: string }
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, data);
}

// ============================================
// CHECKOUT SESSION
// ============================================

interface CreateCheckoutOptions {
  customerId?: string;
  customerEmail?: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  const {
    customerId,
    customerEmail,
    userId,
    successUrl = `${APP_URL}/dashboard?subscription=success`,
    cancelUrl = `${APP_URL}/pricing?subscription=canceled`,
  } = options;

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripeConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  };

  // Use existing customer or email for new customer
  if (customerId) {
    sessionConfig.customer = customerId;
  } else if (customerEmail) {
    sessionConfig.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  console.log(`[STRIPE] Checkout session created: ${session.id} for user ${userId}`);
  return session;
}

// ============================================
// BILLING PORTAL
// ============================================

/**
 * Create a billing portal session for subscription management
 */
export async function createPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${APP_URL}/settings/billing`,
  });

  console.log(`[STRIPE] Portal session created for customer ${customerId}`);
  return session;
}

// ============================================
// SUBSCRIPTION OPERATIONS
// ============================================

/**
 * Retrieve subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if ((error as Stripe.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  console.log(`[STRIPE] Subscription ${subscriptionId} set to cancel at period end`);
  return subscription;
}

/**
 * Cancel subscription immediately
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);

  console.log(`[STRIPE] Subscription ${subscriptionId} canceled immediately`);
  return subscription;
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  console.log(`[STRIPE] Subscription ${subscriptionId} reactivated`);
  return subscription;
}

// ============================================
// INVOICE OPERATIONS
// ============================================

/**
 * List invoices for a customer
 */
export async function listInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  return invoices.data;
}

/**
 * Get upcoming invoice (preview of next charge)
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  } catch (error) {
    // No upcoming invoice if no active subscription
    return null;
  }
}

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripeConfig.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Verify Stripe connection is working
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await stripe.balance.retrieve();
    return true;
  } catch (error) {
    console.error('[STRIPE] Health check failed:', error);
    return false;
  }
}
```

#### Type Definitions

```typescript
// server/services/stripe.types.ts
import Stripe from 'stripe';

// Re-export commonly used Stripe types
export type {
  Stripe,
};

// Subscription status mapping
export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

// Map Stripe status to our status
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'unpaid',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
    'paused': 'canceled', // Treat paused as canceled
  };
  return statusMap[stripeStatus] || 'none';
}

// Checkout session result
export interface CheckoutResult {
  sessionId: string;
  url: string;
}

// Billing info for frontend
export interface BillingInfo {
  status: SubscriptionStatus;
  planName: string;
  priceAmount: number;
  priceCurrency: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
}

// Invoice summary for frontend
export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  date: Date;
  pdfUrl: string | null;
  hostedUrl: string | null;
}
```

### Stripe Dashboard Setup

#### 1. Create Product

In Stripe Dashboard → Products → Add Product:
- **Name:** Aermuse Premium
- **Description:** Full access to AI Attorney, contract templates, and e-signing
- **Image:** Upload Aermuse logo (optional)

#### 2. Create Price

Add a price to the product:
- **Pricing model:** Standard pricing
- **Price:** £9.00
- **Billing period:** Monthly
- **Currency:** GBP

Note the `price_xxx` ID and add to environment variables.

#### 3. Configure Customer Portal

In Stripe Dashboard → Settings → Billing → Customer portal:
- Enable "Update payment methods"
- Enable "View invoice history"
- Enable "Cancel subscription"
- Set return URL to `{APP_URL}/settings/billing`
- Customize branding to match Aermuse

#### 4. Configure Webhook Endpoint

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **Endpoint URL:** `{APP_URL}/api/webhooks/stripe`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Note the `whsec_xxx` signing secret and add to environment variables.

### Local Development with Stripe CLI

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: see https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Note the webhook signing secret provided and use it locally
```

## Definition of Done

- [ ] Stripe SDK installed
- [ ] Environment variables documented
- [ ] Stripe service module working
- [ ] Product and price created in Stripe
- [ ] Customer portal configured
- [ ] Webhook endpoint configured
- [ ] Local webhook forwarding tested
- [ ] Health check endpoint working

## Testing Checklist

### Unit Tests

```typescript
describe('Stripe Service', () => {
  it('creates a customer', async () => {
    const customer = await createCustomer('test@example.com', {
      userId: 'user_123',
      name: 'Test User',
    });
    expect(customer.id).toMatch(/^cus_/);
  });

  it('creates checkout session', async () => {
    const session = await createCheckoutSession({
      customerEmail: 'test@example.com',
      userId: 'user_123',
    });
    expect(session.url).toContain('checkout.stripe.com');
  });

  it('health check passes', async () => {
    const healthy = await healthCheck();
    expect(healthy).toBe(true);
  });
});
```

### Integration Tests

- [ ] Create test customer
- [ ] Create checkout session
- [ ] Verify webhook signature
- [ ] Access customer portal

### Manual Testing

1. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Create checkout session via API
3. Complete test payment with card `4242 4242 4242 4242`
4. Verify webhook received
5. Access customer portal

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.4: Stripe Checkout Flow](./5-4-stripe-checkout-flow.md)
- [Story 5.5: Stripe Webhook Handler](./5-5-stripe-webhook-handler.md)

---

## Tasks/Subtasks

- [ ] **Task 1: Install and configure Stripe SDK**
  - [ ] Run npm install stripe
  - [ ] Update package.json and lock file
  - [ ] Verify Stripe package version

- [ ] **Task 2: Set up environment variables**
  - [ ] Add Stripe keys to .env file
  - [ ] Update .env.example with placeholder values
  - [ ] Document all required Stripe environment variables
  - [ ] Validate environment variable loading

- [ ] **Task 3: Create Stripe product and pricing in Dashboard**
  - [ ] Create "Aermuse Premium" product in Stripe Dashboard
  - [ ] Set up £9/month recurring price
  - [ ] Configure product description and metadata
  - [ ] Copy price ID to environment variables

- [ ] **Task 4: Implement Stripe service module**
  - [ ] Create server/services/stripe.ts with SDK initialization
  - [ ] Implement customer operations (create, get, update)
  - [ ] Implement checkout session creation
  - [ ] Implement billing portal session creation
  - [ ] Implement subscription operations (get, cancel, reactivate)
  - [ ] Implement invoice operations (list, upcoming)
  - [ ] Add webhook verification function
  - [ ] Add health check function

- [ ] **Task 5: Create TypeScript types for Stripe**
  - [ ] Create server/services/stripe.types.ts
  - [ ] Define SubscriptionStatus type
  - [ ] Implement mapStripeStatus function
  - [ ] Define CheckoutResult, BillingInfo, InvoiceSummary interfaces

- [ ] **Task 6: Configure Stripe Customer Portal**
  - [ ] Set up portal in Stripe Dashboard Settings
  - [ ] Enable invoice viewing and downloading
  - [ ] Enable payment method updates
  - [ ] Enable subscription cancellation
  - [ ] Configure return URL
  - [ ] Customize branding to match Aermuse

- [ ] **Task 7: Set up webhook endpoint in Stripe**
  - [ ] Add webhook endpoint URL in Stripe Dashboard
  - [ ] Select webhook events to listen for
  - [ ] Copy webhook signing secret to environment variables
  - [ ] Test webhook delivery with Stripe CLI

- [ ] **Task 8: Testing and verification**
  - [ ] Write unit tests for service functions
  - [ ] Test customer creation
  - [ ] Test checkout session creation
  - [ ] Test health check
  - [ ] Verify webhook signature validation
  - [ ] Manual test with Stripe CLI

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
