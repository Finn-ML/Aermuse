# Story 5.5: Stripe Webhook Handler

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.5 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Stripe Webhook Handler |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** system
**I want** to receive and process Stripe webhook events
**So that** subscription status stays synchronized

## Context

Stripe sends webhook events for subscription lifecycle changes (created, updated, deleted, payment succeeded/failed). We need to handle these events to keep our database in sync with Stripe's subscription state.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup)
- Story 5.2 (Subscription Data Model)

## Acceptance Criteria

- [ ] **AC-1:** Webhook endpoint at `/api/webhooks/stripe`
- [ ] **AC-2:** Signature verification for security
- [ ] **AC-3:** Handle `checkout.session.completed`
- [ ] **AC-4:** Handle `customer.subscription.created`
- [ ] **AC-5:** Handle `customer.subscription.updated`
- [ ] **AC-6:** Handle `customer.subscription.deleted`
- [ ] **AC-7:** Handle `invoice.payment_succeeded`
- [ ] **AC-8:** Handle `invoice.payment_failed`
- [ ] **AC-9:** Idempotent event processing
- [ ] **AC-10:** Logging for debugging

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `server/routes/webhooks/stripe.ts` | New: Webhook handler |
| `server/services/webhooks/stripe-handlers.ts` | New: Event handlers |
| `server/index.ts` | Mount webhook routes |

### Implementation

#### Webhook Route

```typescript
// server/routes/webhooks/stripe.ts
import { Router, raw } from 'express';
import { constructWebhookEvent } from '../../services/stripe';
import { handleStripeEvent } from '../../services/webhooks/stripe-handlers';

const router = Router();

// IMPORTANT: Webhooks need raw body for signature verification
router.post(
  '/',
  raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      console.error('[STRIPE WEBHOOK] Missing signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    try {
      // Verify and construct event
      const event = constructWebhookEvent(req.body, signature);

      console.log(`[STRIPE WEBHOOK] Received: ${event.type} (${event.id})`);

      // Process event
      await handleStripeEvent(event);

      // Acknowledge receipt
      res.json({ received: true, eventId: event.id });
    } catch (error) {
      if ((error as Error).message.includes('signature')) {
        console.error('[STRIPE WEBHOOK] Signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
      }

      console.error('[STRIPE WEBHOOK] Error processing event:', error);
      // Return 200 to prevent retries for processing errors we've logged
      res.status(200).json({ received: true, error: 'Processing error logged' });
    }
  }
);

export default router;
```

#### Event Handlers

```typescript
// server/services/webhooks/stripe-handlers.ts
import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '../../db/schema/users';
import { eq } from 'drizzle-orm';
import { mapStripeStatus } from '../stripe.types';
import type { SubscriptionUpdate } from '../../../shared/types/subscription';

// ============================================
// MAIN EVENT ROUTER
// ============================================

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
  }
}

// ============================================
// CHECKOUT EVENTS
// ============================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[STRIPE WEBHOOK] Checkout completed: ${session.id}`);

  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('[STRIPE WEBHOOK] No userId in session metadata');
    return;
  }

  // Link customer to user if not already linked
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`[STRIPE WEBHOOK] Linked customer ${customerId} to user ${userId}`);
  }
}

// ============================================
// SUBSCRIPTION EVENTS
// ============================================

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription created: ${subscription.id}`);

  const customerId = subscription.customer as string;
  const update = buildSubscriptionUpdate(subscription);

  await updateUserByCustomerId(customerId, update);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription updated: ${subscription.id} -> ${subscription.status}`);

  const customerId = subscription.customer as string;
  const update = buildSubscriptionUpdate(subscription);

  await updateUserByCustomerId(customerId, update);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription deleted: ${subscription.id}`);

  const customerId = subscription.customer as string;

  // Clear subscription data but keep customer ID
  const update: SubscriptionUpdate = {
    stripeSubscriptionId: null,
    subscriptionStatus: 'canceled',
    subscriptionPriceId: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
  };

  await updateUserByCustomerId(customerId, update);
}

// ============================================
// INVOICE EVENTS
// ============================================

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only care about subscription invoices
  if (!invoice.subscription) return;

  console.log(`[STRIPE WEBHOOK] Payment succeeded for subscription: ${invoice.subscription}`);

  const customerId = invoice.customer as string;

  // Update status to active (in case it was past_due)
  await updateUserByCustomerId(customerId, {
    subscriptionStatus: 'active',
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Only care about subscription invoices
  if (!invoice.subscription) return;

  console.log(`[STRIPE WEBHOOK] Payment failed for subscription: ${invoice.subscription}`);

  const customerId = invoice.customer as string;

  // Update status to past_due
  await updateUserByCustomerId(customerId, {
    subscriptionStatus: 'past_due',
  });

  // TODO: Send notification email to user about failed payment
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildSubscriptionUpdate(subscription: Stripe.Subscription): SubscriptionUpdate {
  const priceId = subscription.items.data[0]?.price.id;

  return {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStripeStatus(subscription.status),
    subscriptionPriceId: priceId || null,
    subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

async function updateUserByCustomerId(
  customerId: string,
  update: SubscriptionUpdate
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
    columns: { id: true },
  });

  if (!user) {
    console.error(`[STRIPE WEBHOOK] No user found for customer ${customerId}`);
    return;
  }

  await db
    .update(users)
    .set({
      ...update,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[STRIPE WEBHOOK] Updated user ${user.id}:`, update.subscriptionStatus);
}
```

#### Mount Webhook Routes

```typescript
// server/index.ts
import stripeWebhookRoutes from './routes/webhooks/stripe';

// IMPORTANT: Mount webhook routes BEFORE body-parser middleware
// Stripe webhooks need raw body for signature verification
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Then apply JSON body parser to other routes
app.use(express.json());
```

#### Alternative: Express Middleware Order

```typescript
// server/index.ts - Alternative approach with conditional body parsing
import express from 'express';

const app = express();

// Stripe webhooks need raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// All other routes use JSON
app.use(express.json());

// Mount routes after middleware
import stripeWebhookRoutes from './routes/webhooks/stripe';
app.use('/api/webhooks/stripe', stripeWebhookRoutes);
```

### Webhook Event Reference

| Event | When Triggered | Action |
|-------|----------------|--------|
| `checkout.session.completed` | User completes checkout | Link customer ID |
| `customer.subscription.created` | New subscription starts | Set subscription fields |
| `customer.subscription.updated` | Status/period changes | Update subscription fields |
| `customer.subscription.deleted` | Subscription ends | Clear subscription, mark canceled |
| `invoice.payment_succeeded` | Payment works | Ensure status is active |
| `invoice.payment_failed` | Payment fails | Mark as past_due |

### Idempotency Considerations

```typescript
// Optional: Track processed events to prevent duplicates
// Add to database schema if needed

// server/db/schema/webhook-events.ts
export const webhookEvents = pgTable('webhook_events', {
  id: varchar('id', { length: 255 }).primaryKey(), // Stripe event ID
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow(),
});

// In handler:
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // Check if already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.id, event.id),
  });

  if (existing) {
    console.log(`[STRIPE WEBHOOK] Event ${event.id} already processed`);
    return;
  }

  // Process event...

  // Mark as processed
  await db.insert(webhookEvents).values({
    id: event.id,
    type: event.type,
  });
}
```

## Definition of Done

- [ ] Webhook endpoint receiving events
- [ ] Signature verification working
- [ ] All event types handled
- [ ] User subscription updated correctly
- [ ] Logging in place for debugging
- [ ] Idempotent processing
- [ ] Raw body parsing configured correctly

## Testing Checklist

### Unit Tests

- [ ] mapStripeStatus function
- [ ] buildSubscriptionUpdate helper
- [ ] Event routing

### Integration Tests

- [ ] Signature verification
- [ ] Database updates from events
- [ ] Customer linking

### Manual Testing with Stripe CLI

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### E2E Tests

- [ ] Complete checkout → subscription created
- [ ] Cancel subscription → status updated
- [ ] Payment fails → past_due status

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.1: Stripe Integration Setup](./5-1-stripe-integration-setup.md)
- [Story 5.2: Subscription Data Model](./5-2-subscription-data-model.md)
- [Story 5.9: Subscription Cancellation Handling](./5-9-subscription-cancellation-handling.md)
