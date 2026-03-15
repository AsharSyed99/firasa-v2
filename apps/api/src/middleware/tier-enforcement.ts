import type { Request, Response, NextFunction } from 'express';
import { TIER_LIMITS, type UserTier } from '@firasa/shared';
import { getDb } from '../services/database.js';

/**
 * Enforce that the user's tier allows a specific feature.
 * Usage: requireFeature('tradeTracker'), requireFeature('whatsapp')
 */
export function requireFeature(feature: keyof (typeof TIER_LIMITS)['free']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const tier = req.user.tier as UserTier;
    const limits = TIER_LIMITS[tier];
    const allowed = limits[feature];

    if (!allowed) {
      res.status(403).json({
        success: false,
        error: 'This feature requires a higher plan. Visit Settings to upgrade.',
      });
      return;
    }

    next();
  };
}

/**
 * Enforce maximum guru follow count per tier.
 * Call this before allowing a user to follow a new guru.
 */
export async function enforceGuruLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const tier = req.user.tier as UserTier;
  const limits = TIER_LIMITS[tier];
  const db = getDb();

  const followCount = await db.userGuruConfig.count({
    where: { userId: req.user.id, isFollowing: true },
  });

  if (followCount >= limits.maxGurus) {
    res.status(403).json({
      success: false,
      error: 'You\'ve reached your guru follow limit. Upgrade your plan to follow more.',
    });
    return;
  }

  next();
}

/**
 * Enforce signal history access per tier.
 * Attaches `req.historyLimit` (Date) for use in route handlers.
 */
export function enforceHistoryLimit(req: Request, _res: Response, next: NextFunction): void {
  const tier = (req.user?.tier ?? 'free') as UserTier;
  const limits = TIER_LIMITS[tier];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.historyDays);

  (req as Request & { historyLimit: Date }).historyLimit = cutoff;
  next();
}

/**
 * Track daily API usage per user. Returns 429 if daily budget exceeded.
 * In-memory for now — production should use Redis.
 */
const dailyUsage = new Map<string, { count: number; date: string }>();

export function enforceDailyApiLimit(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }

  const tier = req.user.tier as UserTier;
  const limits = TIER_LIMITS[tier];
  const today = new Date().toISOString().split('T')[0];
  const key = `${req.user.id}:${today}`;

  const usage = dailyUsage.get(key);
  if (usage && usage.date === today) {
    if (usage.count >= limits.maxApiCallsPerDay) {
      res.status(429).json({
        success: false,
        error: 'Daily request limit reached. Upgrade your plan for higher limits.',
      });
      return;
    }
    usage.count++;
  } else {
    dailyUsage.set(key, { count: 1, date: today });
  }

  // Cleanup old entries periodically
  if (dailyUsage.size > 10_000) {
    for (const [k, v] of dailyUsage) {
      if (v.date !== today) dailyUsage.delete(k);
    }
  }

  next();
}
