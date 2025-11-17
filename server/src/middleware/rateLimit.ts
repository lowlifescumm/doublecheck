import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware
 * Default: 60 requests per minute per IP
 * Configurable via RATE_LIMIT_PER_MIN environment variable
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_PER_MIN || '60', 10),
  message: {
    ok: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

