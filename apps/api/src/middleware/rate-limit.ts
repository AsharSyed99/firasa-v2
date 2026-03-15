import rateLimit from 'express-rate-limit';

/** General API rate limit: 100 requests per minute per IP */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, try again later' },
});

/** Strict rate limit for auth endpoints: 5 requests per minute per IP */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, try again later' },
});

/** Pipeline trigger rate limit: 1 request per minute */
export const pipelineLimiter = rateLimit({
  windowMs: 60_000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Pipeline can only be triggered once per minute' },
});
