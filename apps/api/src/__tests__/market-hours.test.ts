import { describe, it, expect } from 'vitest';

describe('market hours detection', () => {
  function isMarketHours(date: Date): boolean {
    const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = et.getDay();
    if (day === 0 || day === 6) return false;
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const timeMinutes = hours * 60 + minutes;
    return timeMinutes >= 570 && timeMinutes < 960;
  }

  it('detects market hours (10 AM ET weekday)', () => {
    // March 15, 2026 is a Sunday actually, use March 16 (Monday)
    const date = new Date('2026-03-16T14:00:00Z'); // 10 AM ET
    expect(isMarketHours(date)).toBe(true);
  });

  it('detects pre-market (8 AM ET)', () => {
    const date = new Date('2026-03-16T12:00:00Z'); // 8 AM ET
    expect(isMarketHours(date)).toBe(false);
  });

  it('detects after-hours (5 PM ET)', () => {
    const date = new Date('2026-03-16T21:00:00Z'); // 5 PM ET
    expect(isMarketHours(date)).toBe(false);
  });

  it('detects weekend', () => {
    const saturday = new Date('2026-03-14T14:00:00Z'); // Saturday
    expect(isMarketHours(saturday)).toBe(false);
  });

  it('detects market open edge (9:30 AM ET)', () => {
    const date = new Date('2026-03-16T13:30:00Z'); // 9:30 AM ET exactly
    expect(isMarketHours(date)).toBe(true);
  });

  it('detects market close edge (4:00 PM ET)', () => {
    const date = new Date('2026-03-16T20:00:00Z'); // 4:00 PM ET exactly
    expect(isMarketHours(date)).toBe(false);
  });
});
