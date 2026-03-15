import { describe, it, expect } from 'vitest';
import { TIMEFRAMES, TIER_LIMITS } from '@firasa/shared';

describe('shared enums', () => {
  it('has 6 timeframes', () => {
    expect(TIMEFRAMES).toHaveLength(6);
    expect(TIMEFRAMES).toContain('1h');
    expect(TIMEFRAMES).toContain('1m');
  });

  it('defines tier limits for all tiers', () => {
    expect(TIER_LIMITS.free.maxGurus).toBe(3);
    expect(TIER_LIMITS.free.maxAlertsPerDay).toBe(5);
    expect(TIER_LIMITS.pro.whatsapp).toBe(true);
    expect(TIER_LIMITS.free.whatsapp).toBe(false);
    expect(TIER_LIMITS.premium.apiAccess).toBe(true);
    expect(TIER_LIMITS.admin.maxGurus).toBe(Infinity);
  });
});
