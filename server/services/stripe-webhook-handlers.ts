import Stripe from 'stripe';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { mapStripeStatus } from './stripe.types';
import type { SubscriptionUpdate } from '../../shared/types/subscription';

// Type helpers for Stripe API v2024+ where some properties moved
interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null;
}

interface SubscriptionWithPeriodEnd extends Stripe.Subscription {
  current_period_end?: number;
}

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
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.stripeCustomerId) {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));

    console.log(`[STRIPE WEBHOOK] Linked customer ${customerId} to user ${userId}`);
  }
}

// ============================================
// SUBSCRIPTION EVENTS
// ============================================

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[STRIPE WEBHOOK] Subscription created: ${subscription.id} status: ${subscription.status}`);

  const customerId = subscription.customer as string;
  const update = buildSubscriptionUpdate(subscription);

  // Don't overwrite if subscription is incomplete - wait for payment to confirm
  if (subscription.status === 'incomplete') {
    console.log(`[STRIPE WEBHOOK] Subscription incomplete, storing ID only`);
    await updateUserByCustomerId(customerId, {
      stripeSubscriptionId: subscription.id,
      subscriptionPriceId: update.subscriptionPriceId,
    });
    return;
  }

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
  const invoiceData = invoice as InvoiceWithSubscription;
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    console.log(`[STRIPE WEBHOOK] Payment succeeded but no subscription ID (one-time payment)`);
    return;
  }

  console.log(`[STRIPE WEBHOOK] Payment succeeded for subscription: ${subscriptionId}`);

  const customerId = invoice.customer as string;

  // Update status to active
  await updateUserByCustomerId(customerId, {
    subscriptionStatus: 'active',
    stripeSubscriptionId: subscriptionId,
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Only care about subscription invoices
  const invoiceData = invoice as InvoiceWithSubscription;
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;
  if (!subscriptionId) return;

  console.log(`[STRIPE WEBHOOK] Payment failed for subscription: ${subscriptionId}`);

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
  const subData = subscription as SubscriptionWithPeriodEnd;
  const periodEnd = subData.current_period_end;

  return {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStripeStatus(subscription.status),
    subscriptionPriceId: priceId || null,
    subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

async function updateUserByCustomerId(
  customerId: string,
  update: SubscriptionUpdate
): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[STRIPE WEBHOOK] No user found for customer ${customerId}`);
    return;
  }

  await db
    .update(users)
    .set(update)
    .where(eq(users.id, user.id));

  console.log(`[STRIPE WEBHOOK] Updated user ${user.id}:`, update.subscriptionStatus);
}
