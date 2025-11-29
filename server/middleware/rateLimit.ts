import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * Allows 5 requests per 15 minutes per IP address.
 * Used for: login, register, forgot-password
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API endpoints.
 * Allows 100 requests per 15 minutes per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for AI analysis endpoints.
 * Allows 10 requests per hour per IP address (expensive operations).
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'AI analysis rate limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
