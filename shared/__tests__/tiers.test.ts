import { describe, it, expect } from 'vitest';
import {
  SUBSCRIPTION_TIERS,
  FREE_TIER_CONTRACT_LIMIT,
  TIER_FEATURES,
  TIER_HIERARCHY,
  canAccessFeature,
  isAtLeastTier,
  type Feature,
} from '../constants/tiers';
import type { SubscriptionTier } from '../schema';

describe('Subscription Tier Constants', () => {
  describe('SUBSCRIPTION_TIERS', () => {
    it('should have three tiers: free, beta, alpha', () => {
      expect(SUBSCRIPTION_TIERS.FREE).toBe('free');
      expect(SUBSCRIPTION_TIERS.BETA).toBe('beta');
      expect(SUBSCRIPTION_TIERS.ALPHA).toBe('alpha');
    });
  });

  describe('FREE_TIER_CONTRACT_LIMIT', () => {
    it('should be 10', () => {
      expect(FREE_TIER_CONTRACT_LIMIT).toBe(10);
    });
  });

  describe('TIER_FEATURES', () => {
    it('should define access for all features', () => {
      const features: Feature[] = [
        'contract-storage',
        'ai-summary',
        'ai-risk-score',
        'ai-red-flags',
        'ai-key-terms',
        'ai-missing-clauses',
        'e-signing',
        'templates',
      ];

      features.forEach((feature) => {
        expect(TIER_FEATURES[feature]).toBeDefined();
        expect(Array.isArray(TIER_FEATURES[feature])).toBe(true);
      });
    });

    it('should allow all tiers to access contract-storage', () => {
      expect(TIER_FEATURES['contract-storage']).toContain('free');
      expect(TIER_FEATURES['contract-storage']).toContain('beta');
      expect(TIER_FEATURES['contract-storage']).toContain('alpha');
    });

    it('should restrict AI features to paid tiers', () => {
      expect(TIER_FEATURES['ai-summary']).not.toContain('free');
      expect(TIER_FEATURES['ai-summary']).toContain('beta');
      expect(TIER_FEATURES['ai-summary']).toContain('alpha');
    });

    it('should restrict advanced AI features to alpha only', () => {
      const alphaOnlyFeatures: Feature[] = ['ai-red-flags', 'ai-key-terms', 'ai-missing-clauses'];

      alphaOnlyFeatures.forEach((feature) => {
        expect(TIER_FEATURES[feature]).not.toContain('free');
        expect(TIER_FEATURES[feature]).not.toContain('beta');
        expect(TIER_FEATURES[feature]).toContain('alpha');
      });
    });

    it('should restrict e-signing and templates to paid tiers', () => {
      expect(TIER_FEATURES['e-signing']).not.toContain('free');
      expect(TIER_FEATURES['e-signing']).toContain('beta');
      expect(TIER_FEATURES['e-signing']).toContain('alpha');

      expect(TIER_FEATURES['templates']).not.toContain('free');
      expect(TIER_FEATURES['templates']).toContain('beta');
      expect(TIER_FEATURES['templates']).toContain('alpha');
    });
  });

  describe('TIER_HIERARCHY', () => {
    it('should have correct hierarchy order', () => {
      expect(TIER_HIERARCHY.free).toBe(0);
      expect(TIER_HIERARCHY.beta).toBe(1);
      expect(TIER_HIERARCHY.alpha).toBe(2);
    });

    it('should have alpha > beta > free', () => {
      expect(TIER_HIERARCHY.alpha).toBeGreaterThan(TIER_HIERARCHY.beta);
      expect(TIER_HIERARCHY.beta).toBeGreaterThan(TIER_HIERARCHY.free);
    });
  });

  describe('canAccessFeature', () => {
    it('should allow free tier to access contract-storage', () => {
      expect(canAccessFeature('free', 'contract-storage')).toBe(true);
    });

    it('should deny free tier access to AI features', () => {
      expect(canAccessFeature('free', 'ai-summary')).toBe(false);
      expect(canAccessFeature('free', 'ai-red-flags')).toBe(false);
    });

    it('should allow beta tier to access basic AI features', () => {
      expect(canAccessFeature('beta', 'ai-summary')).toBe(true);
      expect(canAccessFeature('beta', 'ai-risk-score')).toBe(true);
    });

    it('should deny beta tier access to advanced AI features', () => {
      expect(canAccessFeature('beta', 'ai-red-flags')).toBe(false);
      expect(canAccessFeature('beta', 'ai-key-terms')).toBe(false);
      expect(canAccessFeature('beta', 'ai-missing-clauses')).toBe(false);
    });

    it('should allow alpha tier to access all features', () => {
      const allFeatures: Feature[] = [
        'contract-storage',
        'ai-summary',
        'ai-risk-score',
        'ai-red-flags',
        'ai-key-terms',
        'ai-missing-clauses',
        'e-signing',
        'templates',
      ];

      allFeatures.forEach((feature) => {
        expect(canAccessFeature('alpha', feature)).toBe(true);
      });
    });
  });

  describe('isAtLeastTier', () => {
    it('should return true when user tier equals required tier', () => {
      expect(isAtLeastTier('free', 'free')).toBe(true);
      expect(isAtLeastTier('beta', 'beta')).toBe(true);
      expect(isAtLeastTier('alpha', 'alpha')).toBe(true);
    });

    it('should return true when user tier is higher than required', () => {
      expect(isAtLeastTier('beta', 'free')).toBe(true);
      expect(isAtLeastTier('alpha', 'free')).toBe(true);
      expect(isAtLeastTier('alpha', 'beta')).toBe(true);
    });

    it('should return false when user tier is lower than required', () => {
      expect(isAtLeastTier('free', 'beta')).toBe(false);
      expect(isAtLeastTier('free', 'alpha')).toBe(false);
      expect(isAtLeastTier('beta', 'alpha')).toBe(false);
    });
  });
});
