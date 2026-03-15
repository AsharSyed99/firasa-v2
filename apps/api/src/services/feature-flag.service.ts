import { getDb } from './database.js';
import type { FeatureFlagDto } from '@firasa/shared';

/**
 * Check if a feature flag is enabled for a user.
 * Uses rollout percentage (hash-based) and tier targeting.
 */
export async function isEnabled(flagName: string, userId?: string): Promise<boolean> {
  const db = getDb();

  const flag = await db.featureFlag.findUnique({ where: { name: flagName } });
  if (!flag) return false;
  if (!flag.enabled) return false;

  // If 100% rollout, always enabled
  if (flag.rolloutPercent >= 100) return true;

  // If tier-targeted, check user's tier
  if (flag.targetTiers && userId) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
    if (user) {
      const tiers = JSON.parse(flag.targetTiers) as string[];
      if (tiers.length > 0 && !tiers.includes(user.tier)) return false;
    }
  }

  // Percentage-based rollout using deterministic hash
  if (userId && flag.rolloutPercent > 0 && flag.rolloutPercent < 100) {
    const hash = simpleHash(`${flagName}:${userId}`);
    const bucket = hash % 100;
    return bucket < flag.rolloutPercent;
  }

  return flag.rolloutPercent > 0;
}

/** List all feature flags (admin) */
export async function listFlags(): Promise<FeatureFlagDto[]> {
  const db = getDb();
  const flags = await db.featureFlag.findMany({ orderBy: { name: 'asc' } });
  return flags.map((f) => ({
    name: f.name,
    enabled: f.enabled,
    rolloutPercent: f.rolloutPercent,
  }));
}

/** Create or update a feature flag */
export async function upsertFlag(
  name: string,
  data: { enabled?: boolean; rolloutPercent?: number; description?: string; targetTiers?: string[] }
): Promise<FeatureFlagDto> {
  const db = getDb();
  const flag = await db.featureFlag.upsert({
    where: { name },
    create: {
      name,
      enabled: data.enabled ?? false,
      rolloutPercent: data.rolloutPercent ?? 0,
      description: data.description,
      targetTiers: data.targetTiers ? JSON.stringify(data.targetTiers) : null,
    },
    update: {
      enabled: data.enabled,
      rolloutPercent: data.rolloutPercent,
      description: data.description,
      targetTiers: data.targetTiers ? JSON.stringify(data.targetTiers) : undefined,
    },
  });
  return { name: flag.name, enabled: flag.enabled, rolloutPercent: flag.rolloutPercent };
}

/** Deterministic hash for consistent percentage rollout */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
