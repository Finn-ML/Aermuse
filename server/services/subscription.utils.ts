import type {
  SubscriptionStatus,
  SubscriptionTier,
  FeatureAccess,
} from '../../shared/types/subscription';

// ============================================
// CONSTANTS
// ============================================

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

// ============================================
// SUBSCRIPTION ACCESS CHECKS
// ============================================

/**
 * Check if a subscription status grants premium access
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if a user has premium access (including grace periods)
 */
export function hasPremiumAccess(
  status: SubscriptionStatus,
  periodEnd: Date | null
): boolean {
  // Active or trialing always has access
  if (ACTIVE_STATUSES.includes(status)) {
    return true;
  }

  // Canceled or past_due has access until period end
  if ((status === 'canceled' || status === 'past_due') && periodEnd) {
    return new Date(periodEnd) > new Date();
  }

  return false;
}

/**
 * Get subscription tier based on status
 */
export function getSubscriptionTier(
  status: SubscriptionStatus,
  periodEnd: Date | null
): SubscriptionTier {
  return hasPremiumAccess(status, periodEnd) ? 'premium' : 'free';
}

/**
 * Calculate days remaining in subscription
 */
export function getDaysRemaining(periodEnd: Date | null): number | null {
  if (!periodEnd) return null;

  const now = new Date();
  const end = new Date(periodEnd);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get feature access flags based on subscription
 */
export function getFeatureAccess(
  status: SubscriptionStatus,
  periodEnd: Date | null
): FeatureAccess {
  const isPremium = hasPremiumAccess(status, periodEnd);

  return {
    aiAnalysis: isPremium,
    eSigning: isPremium,
    templates: isPremium,
    unlimitedContracts: isPremium,
    pdfExport: isPremium,
  };
}
