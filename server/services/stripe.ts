import Stripe from 'stripe';
import type { CreateCheckoutOptions, CustomerMetadata } from './stripe.types';

import type { SubscriptionTier } from '@shared/schema';

// Validate required environment variables (support both TEST_ and regular names for Replit)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.TEST_STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.TEST_STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || process.env.TEST_STRIPE_PRICE_ID;
const STRIPE_BETA_PRICE_ID = process.env.STRIPE_BETA_PRICE_ID;
const STRIPE_BETA_YEARLY_PRICE_ID = process.env.STRIPE_BETA_YEARLY_PRICE_ID;
const STRIPE_ALPHA_PRICE_ID = process.env.STRIPE_ALPHA_PRICE_ID;
const STRIPE_ALPHA_YEARLY_PRICE_ID = process.env.STRIPE_ALPHA_YEARLY_PRICE_ID;
const STRIPE_THETA_PRICE_ID = process.env.STRIPE_THETA_PRICE_ID;
const STRIPE_THETA_YEARLY_PRICE_ID = process.env.STRIPE_THETA_YEARLY_PRICE_ID;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!STRIPE_PRICE_ID) {
  console.warn('[STRIPE] STRIPE_PRICE_ID not set - checkout will fail');
}

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  typescript: true,
});

export { stripe };

// ============================================
// CONFIGURATION
// ============================================

export const stripeConfig = {
  priceId: STRIPE_PRICE_ID || '',
  betaPriceId: STRIPE_BETA_PRICE_ID || '',
  betaYearlyPriceId: STRIPE_BETA_YEARLY_PRICE_ID || '',
  alphaPriceId: STRIPE_ALPHA_PRICE_ID || '',
  alphaYearlyPriceId: STRIPE_ALPHA_YEARLY_PRICE_ID || '',
  thetaPriceId: STRIPE_THETA_PRICE_ID || '',
  thetaYearlyPriceId: STRIPE_THETA_YEARLY_PRICE_ID || '',
  webhookSecret: STRIPE_WEBHOOK_SECRET || '',
  appUrl: APP_URL,
  currency: 'gbp',
  subscriptionMode: 'subscription' as const,
};

/**
 * Map Stripe price ID to subscription tier
 * Supports both monthly and yearly price IDs for each tier
 */
export function priceIdToTier(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return 'free';

  // Theta tier (monthly or yearly)
  if (priceId === STRIPE_THETA_PRICE_ID || priceId === STRIPE_THETA_YEARLY_PRICE_ID) return 'theta';

  // Alpha tier (monthly or yearly)
  if (priceId === STRIPE_ALPHA_PRICE_ID || priceId === STRIPE_ALPHA_YEARLY_PRICE_ID) return 'alpha';

  // Beta tier (monthly or yearly)
  if (priceId === STRIPE_BETA_PRICE_ID || priceId === STRIPE_BETA_YEARLY_PRICE_ID) return 'beta';

  // Legacy price ID maps to beta for backwards compatibility
  if (priceId === STRIPE_PRICE_ID) return 'beta';

  console.warn(`[STRIPE] Unknown price ID: ${priceId} - defaulting to free`);
  return 'free';
}

/**
 * Get Stripe price ID for a tier
 */
export function tierToPriceId(tier: 'beta' | 'alpha' | 'theta'): string {
  if (tier === 'theta') {
    return STRIPE_THETA_PRICE_ID || stripeConfig.priceId;
  }
  if (tier === 'alpha') {
    return STRIPE_ALPHA_PRICE_ID || stripeConfig.priceId;
  }
  return STRIPE_BETA_PRICE_ID || stripeConfig.priceId;
}

// ============================================
// CUSTOMER OPERATIONS
// ============================================

/**
 * Create a new Stripe customer
 */
export async function createCustomer(
  email: string,
  metadata: CustomerMetadata
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
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
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
    tier = 'beta',
    successUrl = `${APP_URL}/dashboard?subscription=success`,
    cancelUrl = `${APP_URL}/pricing?subscription=canceled`,
  } = options;

  // Get the appropriate price ID based on tier
  const priceId = tierToPriceId(tier);

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
  };

  // Use existing customer or email for new customer
  if (customerId) {
    sessionConfig.customer = customerId;
  } else if (customerEmail) {
    sessionConfig.customer_email = customerEmail;
  }

  console.log(`[STRIPE] Creating checkout for tier: ${tier} with price: ${priceId}`);
  console.log(`[STRIPE] APP_URL env value: ${APP_URL}`);

  const session = await stripe.checkout.sessions.create(sessionConfig);

  console.log(`[STRIPE] Checkout session created: ${session.id} for user ${userId} tier ${tier}`);
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
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
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
): Promise<Stripe.UpcomingInvoice | null> {
  try {
    return await stripe.invoices.createPreview({
      customer: customerId,
    });
  } catch {
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
