import Stripe from 'stripe';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { mapStripeStatus } from './stripe.types';
import type { SubscriptionUpdate } from '../../shared/types/subscription';

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
  // Only care about subscription invoices - use parent to get subscription reference
  const subscriptionId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  console.log(`[STRIPE WEBHOOK] Payment succeeded for subscription: ${subscriptionId}`);

  const customerId = invoice.customer as string;

  // Update status to active (in case it was past_due)
  await updateUserByCustomerId(customerId, {
    subscriptionStatus: 'active',
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Only care about subscription invoices - use parent to get subscription reference
  const subscriptionId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
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
  // Access current_period_end - may be under different name in newer API versions
  const periodEnd = (subscription as any).current_period_end;

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
