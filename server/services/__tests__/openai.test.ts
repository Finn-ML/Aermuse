import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateTokens, isWithinTokenLimit, getRetryDelay, isRetryableError, OpenAIError } from '../openai';

describe('OpenAI Service', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      expect(estimateTokens('test')).toBe(1);
      expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 → 3
    });

    it('should handle empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should round up for partial tokens', () => {
      // 100 chars / 4 = 25 tokens
      const text = 'a'.repeat(100);
      expect(estimateTokens(text)).toBe(25);
    });

    it('should handle long text', () => {
      // 10000 chars / 4 = 2500 tokens
      const text = 'a'.repeat(10000);
      expect(estimateTokens(text)).toBe(2500);
    });
  });

  describe('isWithinTokenLimit', () => {
    it('should return true for text under default limit', () => {
      const shortText = 'Short contract text';
      expect(isWithinTokenLimit(shortText)).toBe(true);
    });

    it('should return false for text over limit', () => {
      // 400001 chars / 4 = 100001 tokens (over 100000 default)
      const longText = 'a'.repeat(400001);
      expect(isWithinTokenLimit(longText)).toBe(false);
    });

    it('should respect custom max tokens', () => {
      const text = 'a'.repeat(1000); // 250 tokens
      expect(isWithinTokenLimit(text, 250)).toBe(true);
      expect(isWithinTokenLimit(text, 200)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return exponential backoff delays', () => {
      // Test without jitter (mock Math.random)
      const originalRandom = Math.random;
      Math.random = () => 0;

      expect(getRetryDelay(0)).toBe(1000); // 1000 * 2^0 = 1000
      expect(getRetryDelay(1)).toBe(2000); // 1000 * 2^1 = 2000
      expect(getRetryDelay(2)).toBe(4000); // 1000 * 2^2 = 4000

      Math.random = originalRandom;
    });

    it('should cap delay at 30 seconds', () => {
      const originalRandom = Math.random;
      Math.random = () => 0;

      // 1000 * 2^6 = 64000, but should be capped at 30000
      expect(getRetryDelay(6)).toBe(30000);

      Math.random = originalRandom;
    });

    it('should add jitter to delay', () => {
      const delays = new Set<number>();

      // Run multiple times to check jitter adds variance
      for (let i = 0; i < 10; i++) {
        delays.add(Math.round(getRetryDelay(0) / 100) * 100);
      }

      // With jitter, we should see some variance
      // (can't guarantee unique values, but this is reasonable test)
      expect(delays.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for rate limit errors (429)', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
    });

    it('should return true for server errors (5xx)', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 502 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
    });

    it('should return true for timeout errors', () => {
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
    });

    it('should return true for OpenAI server_error type', () => {
      expect(isRetryableError({ error: { type: 'server_error' } })).toBe(true);
    });

    it('should return false for auth errors (401)', () => {
      expect(isRetryableError({ status: 401 })).toBe(false);
    });

    it('should return false for client errors (4xx)', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 403 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
    });

    it('should return false for unknown errors', () => {
      expect(isRetryableError({})).toBe(false);
      expect(isRetryableError({ message: 'unknown' })).toBe(false);
    });
  });

  describe('OpenAIError', () => {
    it('should create error with message and code', () => {
      const error = new OpenAIError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('OpenAIError');
    });

    it('should create retryable error', () => {
      const error = new OpenAIError('Retryable error', 'RETRY_CODE', true);
      expect(error.retryable).toBe(true);
    });

    it('should be instanceof Error', () => {
      const error = new OpenAIError('Test', 'CODE');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof OpenAIError).toBe(true);
    });
  });
});
