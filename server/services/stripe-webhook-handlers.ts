import Stripe from 'stripe';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { mapStripeStatus } from './stripe.types';
import { priceIdToTier } from './stripe';
import type { SubscriptionUpdate } from '../../shared/types/subscription';
import { storage } from '../storage';

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

  // Check if this is a merch purchase
  if (session.metadata?.type === 'merch_purchase') {
    await handleMerchCheckoutCompleted(session);
    return;
  }

  // Check both metadata.userId (API-created sessions) and client_reference_id (Payment Links)
  const userId = session.metadata?.userId || session.client_reference_id;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('[STRIPE WEBHOOK] No userId in session metadata or client_reference_id');
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

  // Clear subscription data but keep customer ID, reset tier to free
  const update: SubscriptionUpdate = {
    stripeSubscriptionId: null,
    subscriptionStatus: 'canceled',
    subscriptionPriceId: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
    subscriptionTier: 'free',
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
// MERCH CHECKOUT HANDLER
// ============================================

async function handleMerchCheckoutCompleted(session: Stripe.Checkout.Session) {
  const artistId = session.metadata?.artistId;
  const itemsJson = session.metadata?.items;
  if (!artistId || !itemsJson) {
    console.error('[STRIPE WEBHOOK] Merch checkout missing metadata');
    return;
  }

  // Check for duplicate
  const existing = await storage.getOrderByCheckoutSession(session.id);
  if (existing) {
    console.log('[STRIPE WEBHOOK] Merch order already exists for session', session.id);
    return;
  }

  const items = JSON.parse(itemsJson) as Array<{ productId: string; variantId?: string; quantity: number }>;

  // Create order
  const order = await storage.createOrder({
    artistId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null,
    status: 'paid',
    customerEmail: session.customer_details?.email || session.customer_email || '',
    customerName: session.customer_details?.name || '',
    shippingAddress: (session as any).shipping_details?.address
      ? JSON.stringify((session as any).shipping_details.address)
      : null,
    subtotal: session.amount_subtotal || 0,
    shippingCost: session.total_details?.amount_shipping || 0,
    platformFee: 0, // calculated by Stripe via application_fee_amount
    total: session.amount_total || 0,
    currency: session.currency || 'gbp',
    paidAt: new Date(),
  });

  // Create order items and decrement inventory
  for (const item of items) {
    const product = await storage.getProduct(item.productId);
    const variant = item.variantId ? await storage.getProductVariant(item.variantId) : null;

    const unitPrice = variant?.priceOverride || product?.basePrice || 0;

    await storage.createOrderItem({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId || null,
      productName: product?.name || 'Unknown Product',
      variantName: variant?.name || null,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    });

    // Decrement inventory
    if (item.variantId) {
      await storage.decrementVariantInventory(item.variantId, item.quantity);
    }
  }

  console.log(`[STRIPE WEBHOOK] Merch order created: ${order.id} for artist ${artistId}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildSubscriptionUpdate(subscription: Stripe.Subscription): SubscriptionUpdate {
  const priceId = subscription.items.data[0]?.price.id;
  const subData = subscription as SubscriptionWithPeriodEnd;
  const periodEnd = subData.current_period_end;
  const status = mapStripeStatus(subscription.status);

  // Determine tier: use metadata if available, otherwise derive from price ID
  const metadataTier = subscription.metadata?.tier as 'beta' | 'alpha' | 'theta' | undefined;
  const tier = metadataTier || priceIdToTier(priceId);

  // Only set tier if subscription is active/trialing
  const isActive = status === 'active' || status === 'trialing';

  return {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    subscriptionPriceId: priceId || null,
    subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    subscriptionTier: isActive ? tier : 'free',
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
