import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { TIER_LIMITS, type UserTier } from '@firasa/shared';

/**
 * Extract rate limit key: use userId if authenticated, fallback to IP.
 * This prevents a user from bypassing limits with multiple IPs.
 */
function userOrIpKey(req: Request): string {
  return req.user?.id ?? req.ip ?? 'unknown';
}

/** General API rate limit: per-IP for unauthenticated, per-user for authenticated */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, try again later' },
});

/**
 * Per-user rate limiter — enforces tier-based API call budget.
 * Applied AFTER auth middleware so req.user is available.
 * Free: 20/min, Pro: 60/min, Premium: 120/min.
 */
export const perUserLimiter = rateLimit({
  windowMs: 60_000,
  keyGenerator: userOrIpKey,
  max: (req: Request, _res: Response) => {
    const tier = (req.user?.tier ?? 'free') as UserTier;
    return TIER_LIMITS[tier].maxApiCallsPerMin;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Per-user rate limit exceeded. Upgrade your plan for higher limits.',
  },
});

/** Strict rate limit for auth endpoints: 5 requests per minute per IP */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, try again later' },
});

/** Admin-only operation rate limit: 1 per minute */
export const pipelineLimiter = rateLimit({
  windowMs: 60_000,
  max: 1,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Please wait before retrying this operation.' },
});

/** Data endpoint rate limit: tier-aware */
export const signalFetchLimiter = rateLimit({
  windowMs: 60_000,
  max: (req: Request, _res: Response) => {
    const tier = (req.user?.tier ?? 'free') as UserTier;
    const dailyLimit = TIER_LIMITS[tier].maxSignalFetches;
    return Math.min(Math.ceil(dailyLimit / 24 / 60 * 10), 60);
  },
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down or upgrade your plan.',
  },
});
