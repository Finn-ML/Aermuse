import Stripe from 'stripe';
import type { CreateCheckoutOptions, CustomerMetadata } from './stripe.types';

// Validate required environment variables (support both TEST_ and regular names for Replit)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.TEST_STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.TEST_STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || process.env.TEST_STRIPE_PRICE_ID;
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
  webhookSecret: STRIPE_WEBHOOK_SECRET || '',
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

  console.log(`[STRIPE] Creating checkout with success_url: ${successUrl}`);
  console.log(`[STRIPE] APP_URL env value: ${APP_URL}`);

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
