import type { SubscriptionTier } from '../schema';

/**
 * Subscription tier constants and feature access matrix (Epic 12)
 */

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BETA: 'beta',
  ALPHA: 'alpha',
} as const;

export const FREE_TIER_CONTRACT_LIMIT = 10;

/**
 * Feature identifiers for tier-based access control
 */
export type Feature =
  | 'contract-storage'
  | 'ai-summary'
  | 'ai-risk-score'
  | 'ai-red-flags'
  | 'ai-key-terms'
  | 'ai-missing-clauses'
  | 'e-signing'
  | 'templates';

/**
 * Feature access matrix - defines which tiers can access each feature
 */
export const TIER_FEATURES: Record<Feature, SubscriptionTier[]> = {
  'contract-storage': ['free', 'beta', 'alpha'],
  'ai-summary': ['beta', 'alpha'],
  'ai-risk-score': ['beta', 'alpha'],
  'ai-red-flags': ['alpha'],
  'ai-key-terms': ['alpha'],
  'ai-missing-clauses': ['alpha'],
  'e-signing': ['beta', 'alpha'],
  'templates': ['beta', 'alpha'],
} as const;

/**
 * Tier hierarchy for comparison (higher number = more access)
 */
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  beta: 1,
  alpha: 2,
};

/**
 * Check if a tier can access a specific feature
 */
export function canAccessFeature(tier: SubscriptionTier, feature: Feature): boolean {
  return TIER_FEATURES[feature].includes(tier);
}

/**
 * Check if tier A is at least as high as tier B
 */
export function isAtLeastTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}
