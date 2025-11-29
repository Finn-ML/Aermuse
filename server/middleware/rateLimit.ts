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
 * Allows 10 requests per hour per user (expensive operations).
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'AI analysis limit reached. You can analyze up to 10 contracts per hour.',
    code: 'AI_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Rate limit by user ID, not IP
    return req.session?.userId || req.ip;
  },
  handler: (req: any, res: any) => {
    console.log(`[AI] Rate limit hit for user ${req.session?.userId}`);
    res.status(429).json({
      error: 'AI analysis limit reached. You can analyze up to 10 contracts per hour.',
      code: 'AI_RATE_LIMIT',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});
