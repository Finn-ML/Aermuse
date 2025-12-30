import type { SubscriptionTier } from '../schema';

/**
 * Subscription status values - maps to Stripe subscription statuses
 */
export type SubscriptionStatus =
  | 'none'              // Never subscribed
  | 'trialing'          // In trial period
  | 'active'            // Paid and active
  | 'past_due'          // Payment failed, grace period
  | 'canceled'          // Canceled, may still have access until period end
  | 'unpaid'            // Payment failed, access revoked
  | 'incomplete'        // Initial payment pending
  | 'incomplete_expired'; // Initial payment failed

/**
 * Subscription tier - re-export from schema for consistency
 */
export type { SubscriptionTier } from '../schema';

/**
 * User subscription data (for frontend)
 */
export interface UserSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  hasAccess: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
}

/**
 * Subscription update payload (for webhook handlers)
 */
export interface SubscriptionUpdate {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPriceId?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  subscriptionCancelAtPeriodEnd?: boolean;
  subscriptionTier?: SubscriptionTier;
}

/**
 * Feature access flags
 */
export interface FeatureAccess {
  aiAnalysis: boolean;
  eSigning: boolean;
  templates: boolean;
  unlimitedContracts: boolean;
  pdfExport: boolean;
}

/**
 * Contract limit check result
 */
export interface ContractLimitResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

/**
 * Subscription price info
 */
export const SUBSCRIPTION_PRICE = {
  amount: 1000, // pence
  currency: 'gbp',
  interval: 'month',
  displayPrice: '£10',
} as const;

/**
 * Free tier limits
 */
export const FREE_TIER_LIMITS = {
  maxContracts: 10,      // Free users can store up to 10 contracts
  aiAnalysis: false,     // Premium only
  eSigning: false,       // Premium only
  templates: true,       // All templates available to free users
  pdfExport: true,       // Available to all
} as const;
