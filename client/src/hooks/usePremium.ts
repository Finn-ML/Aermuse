import { useAuth } from '@/lib/auth';
import type { SubscriptionTier } from '@shared/schema';
import { TIER_FEATURES, canAccessFeature, type Feature } from '@shared/constants/tiers';

/**
 * Premium state interface (Epic 12)
 */
export interface PremiumState {
  tier: SubscriptionTier;
  isPremium: boolean;      // beta, alpha, or theta (active subscription)
  isAlpha: boolean;        // alpha only
  isTheta: boolean;        // theta only (highest tier)
  canAccess: (feature: Feature) => boolean;
  user: ReturnType<typeof useAuth>['user'];
  isLoading: boolean;
  subscriptionStatus: string;
}

/**
 * Hook to check premium subscription status and tier-based feature access
 */
export function usePremium(): PremiumState {
  const { user, isLoading } = useAuth();

  const subscriptionStatus = user?.subscriptionStatus || 'none';
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  // Determine tier: use subscriptionTier field if active, otherwise 'free'
  // For active subscribers with no tier set (or 'free' from migration), default to 'beta'
  const rawTier = user?.subscriptionTier as SubscriptionTier | null | undefined;
  const tier: SubscriptionTier = isActive
    ? (rawTier && rawTier !== 'free' ? rawTier : 'beta')
    : 'free';

  const isPremium = tier === 'beta' || tier === 'alpha' || tier === 'theta';
  const isAlpha = tier === 'alpha';
  const isTheta = tier === 'theta';

  const canAccess = (feature: Feature): boolean => {
    return canAccessFeature(tier, feature);
  };

  return {
    tier,
    isPremium,
    isAlpha,
    isTheta,
    canAccess,
    user,
    isLoading,
    subscriptionStatus
  };
}
