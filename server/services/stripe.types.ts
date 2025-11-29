import Stripe from 'stripe';

// Re-export commonly used Stripe types
export type { Stripe };

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

// Checkout session options
export interface CreateCheckoutOptions {
  customerId?: string;
  customerEmail?: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

// Customer metadata
export interface CustomerMetadata {
  userId: string;
  name?: string;
}
