import { describe, it, expect } from 'vitest';
import {
  hasActiveSubscription,
  hasPremiumAccess,
  getSubscriptionTier,
  getDaysRemaining,
  getFeatureAccess,
} from '../subscription.utils';

describe('Subscription Service', () => {
  describe('hasActiveSubscription', () => {
    it('returns true for active status', () => {
      expect(hasActiveSubscription('active')).toBe(true);
    });

    it('returns true for trialing status', () => {
      expect(hasActiveSubscription('trialing')).toBe(true);
    });

    it('returns false for canceled status', () => {
      expect(hasActiveSubscription('canceled')).toBe(false);
    });

    it('returns false for past_due status', () => {
      expect(hasActiveSubscription('past_due')).toBe(false);
    });

    it('returns false for none status', () => {
      expect(hasActiveSubscription('none')).toBe(false);
    });

    it('returns false for unpaid status', () => {
      expect(hasActiveSubscription('unpaid')).toBe(false);
    });
  });

  describe('hasPremiumAccess', () => {
    it('returns true for active regardless of period end', () => {
      expect(hasPremiumAccess('active', null)).toBe(true);
      expect(hasPremiumAccess('active', new Date())).toBe(true);
    });

    it('returns true for trialing regardless of period end', () => {
      expect(hasPremiumAccess('trialing', null)).toBe(true);
    });

    it('returns true for canceled with future period end', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('canceled', futureDate)).toBe(true);
    });

    it('returns false for canceled with past period end', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('canceled', pastDate)).toBe(false);
    });

    it('returns true for past_due with future period end', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('past_due', futureDate)).toBe(true);
    });

    it('returns false for past_due with past period end', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(hasPremiumAccess('past_due', pastDate)).toBe(false);
    });

    it('returns false for none status', () => {
      expect(hasPremiumAccess('none', null)).toBe(false);
    });

    it('returns false for unpaid status', () => {
      expect(hasPremiumAccess('unpaid', null)).toBe(false);
    });

    it('returns false for incomplete status', () => {
      expect(hasPremiumAccess('incomplete', null)).toBe(false);
    });

    it('returns false for incomplete_expired status', () => {
      expect(hasPremiumAccess('incomplete_expired', null)).toBe(false);
    });
  });

  describe('getSubscriptionTier', () => {
    it('returns premium for active status', () => {
      expect(getSubscriptionTier('active', null)).toBe('premium');
    });

    it('returns premium for trialing status', () => {
      expect(getSubscriptionTier('trialing', null)).toBe('premium');
    });

    it('returns premium for canceled with future period end', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(getSubscriptionTier('canceled', futureDate)).toBe('premium');
    });

    it('returns free for canceled with past period end', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getSubscriptionTier('canceled', pastDate)).toBe('free');
    });

    it('returns free for none status', () => {
      expect(getSubscriptionTier('none', null)).toBe('free');
    });

    it('returns free for unpaid status', () => {
      expect(getSubscriptionTier('unpaid', null)).toBe('free');
    });
  });

  describe('getDaysRemaining', () => {
    it('returns correct days for future date', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const days = getDaysRemaining(futureDate);
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(8);
    });

    it('returns 0 for past date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getDaysRemaining(pastDate)).toBe(0);
    });

    it('returns null for null input', () => {
      expect(getDaysRemaining(null)).toBeNull();
    });

    it('returns 1 for date approximately 1 day away', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const days = getDaysRemaining(futureDate);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(2);
    });
  });

  describe('getFeatureAccess', () => {
    it('returns all true for active status', () => {
      const access = getFeatureAccess('active', null);
      expect(access.aiAnalysis).toBe(true);
      expect(access.eSigning).toBe(true);
      expect(access.templates).toBe(true);
      expect(access.unlimitedContracts).toBe(true);
      expect(access.pdfExport).toBe(true);
    });

    it('returns all true for trialing status', () => {
      const access = getFeatureAccess('trialing', null);
      expect(access.aiAnalysis).toBe(true);
      expect(access.eSigning).toBe(true);
    });

    it('returns all false for none status', () => {
      const access = getFeatureAccess('none', null);
      expect(access.aiAnalysis).toBe(false);
      expect(access.eSigning).toBe(false);
      expect(access.templates).toBe(false);
      expect(access.unlimitedContracts).toBe(false);
      expect(access.pdfExport).toBe(false);
    });

    it('returns all true for canceled with future period end', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const access = getFeatureAccess('canceled', futureDate);
      expect(access.aiAnalysis).toBe(true);
      expect(access.eSigning).toBe(true);
    });

    it('returns all false for canceled with past period end', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const access = getFeatureAccess('canceled', pastDate);
      expect(access.aiAnalysis).toBe(false);
      expect(access.eSigning).toBe(false);
    });
  });
});
