import { describe, it, expect } from 'vitest';
import { mapStripeStatus } from '../stripe.types';

describe('Stripe Types', () => {
  describe('mapStripeStatus', () => {
    it('maps active status correctly', () => {
      expect(mapStripeStatus('active')).toBe('active');
    });

    it('maps trialing status correctly', () => {
      expect(mapStripeStatus('trialing')).toBe('trialing');
    });

    it('maps past_due status correctly', () => {
      expect(mapStripeStatus('past_due')).toBe('past_due');
    });

    it('maps canceled status correctly', () => {
      expect(mapStripeStatus('canceled')).toBe('canceled');
    });

    it('maps unpaid status correctly', () => {
      expect(mapStripeStatus('unpaid')).toBe('unpaid');
    });

    it('maps incomplete status correctly', () => {
      expect(mapStripeStatus('incomplete')).toBe('incomplete');
    });

    it('maps incomplete_expired status correctly', () => {
      expect(mapStripeStatus('incomplete_expired')).toBe('incomplete_expired');
    });

    it('maps paused status to canceled', () => {
      expect(mapStripeStatus('paused')).toBe('canceled');
    });
  });
});

// Note: Service function tests require a real Stripe test key or proper mocking.
// These are better suited as integration tests.
// Run with: STRIPE_SECRET_KEY=sk_test_xxx npm test
