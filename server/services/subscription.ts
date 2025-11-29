import { db } from '../db';
import { users, contracts } from '@shared/schema';
import { eq, count } from 'drizzle-orm';
import type {
  SubscriptionStatus,
  UserSubscription,
  SubscriptionUpdate,
  ContractLimitResult,
} from '../../shared/types/subscription';
import { FREE_TIER_LIMITS } from '../../shared/types/subscription';
import {
  hasPremiumAccess,
  getSubscriptionTier,
  getDaysRemaining,
} from './subscription.utils';

// Re-export pure utility functions for convenience
export {
  hasActiveSubscription,
  hasPremiumAccess,
  getSubscriptionTier,
  getDaysRemaining,
  getFeatureAccess,
} from './subscription.utils';

// ============================================
// USER SUBSCRIPTION DATA
// ============================================

/**
 * Get user subscription data for frontend
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const [user] = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
      subscriptionCancelAtPeriodEnd: users.subscriptionCancelAtPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return {
      status: 'none',
      tier: 'free',
      hasAccess: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      daysRemaining: null,
    };
  }

  const status = (user.subscriptionStatus || 'none') as SubscriptionStatus;
  const periodEnd = user.subscriptionCurrentPeriodEnd;

  return {
    status,
    tier: getSubscriptionTier(status, periodEnd),
    hasAccess: hasPremiumAccess(status, periodEnd),
    currentPeriodEnd: periodEnd?.toISOString() || null,
    cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd || false,
    daysRemaining: getDaysRemaining(periodEnd),
  };
}

/**
 * Check if user can perform premium action
 */
export async function canAccessPremiumFeature(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription.hasAccess;
}

// ============================================
// UPDATE SUBSCRIPTION
// ============================================

/**
 * Update user subscription data (called from webhooks)
 */
export async function updateUserSubscription(
  userId: string,
  update: SubscriptionUpdate
): Promise<void> {
  await db
    .update(users)
    .set(update)
    .where(eq(users.id, userId));

  console.log(`[SUBSCRIPTION] Updated user ${userId}:`, update.subscriptionStatus);
}

/**
 * Update subscription by Stripe customer ID
 */
export async function updateSubscriptionByCustomerId(
  customerId: string,
  update: SubscriptionUpdate
): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[SUBSCRIPTION] No user found for customer ${customerId}`);
    return;
  }

  await updateUserSubscription(user.id, update);
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(customerId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  return user?.id || null;
}

/**
 * Link Stripe customer to user
 */
export async function linkStripeCustomer(
  userId: string,
  customerId: string
): Promise<void> {
  await db
    .update(users)
    .set({ stripeCustomerId: customerId })
    .where(eq(users.id, userId));

  console.log(`[SUBSCRIPTION] Linked customer ${customerId} to user ${userId}`);
}

// ============================================
// CONTRACT LIMITS
// ============================================

/**
 * Check if user can create more contracts
 */
export async function canCreateContract(userId: string): Promise<ContractLimitResult> {
  const subscription = await getUserSubscription(userId);

  // Premium users have unlimited
  if (subscription.hasAccess) {
    return { allowed: true };
  }

  // Count user's contracts
  const [result] = await db
    .select({ count: count() })
    .from(contracts)
    .where(eq(contracts.userId, userId));

  const contractCount = result?.count || 0;

  if (contractCount >= FREE_TIER_LIMITS.maxContracts) {
    return {
      allowed: false,
      reason: 'Free tier contract limit reached',
      limit: FREE_TIER_LIMITS.maxContracts,
      current: contractCount,
    };
  }

  return {
    allowed: true,
    limit: FREE_TIER_LIMITS.maxContracts,
    current: contractCount,
  };
}
