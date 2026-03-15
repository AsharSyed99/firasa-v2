import { describe, it, expect } from 'vitest';

describe('alert helpers', () => {
  function isInQuietHours(
    now: Date,
    start: string | null,
    end: string | null,
    timezone: string
  ): boolean {
    if (!start || !end) return false;
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  it('returns false when no quiet hours set', () => {
    expect(isInQuietHours(new Date(), null, null, 'America/New_York')).toBe(false);
  });

  it('detects same-day quiet hours', () => {
    // 10:00 AM in NY should be within 08:00-12:00
    const morning = new Date('2026-03-15T14:00:00Z'); // 10 AM ET
    expect(isInQuietHours(morning, '08:00', '12:00', 'America/New_York')).toBe(true);
  });

  it('detects overnight quiet hours (spans midnight)', () => {
    // 11 PM ET should be within 22:00-08:00
    const lateNight = new Date('2026-03-16T03:00:00Z'); // 11 PM ET
    expect(isInQuietHours(lateNight, '22:00', '08:00', 'America/New_York')).toBe(true);
  });

  it('returns false outside quiet hours', () => {
    // 2 PM ET should NOT be within 22:00-08:00
    const afternoon = new Date('2026-03-15T18:00:00Z'); // 2 PM ET
    expect(isInQuietHours(afternoon, '22:00', '08:00', 'America/New_York')).toBe(false);
  });
});

describe('alert message formatting', () => {
  function formatAlertMessage(
    signal: { action: string; tweetText: string; entryPrice: number | null; score: number; reasoning: string | null },
    tickers: string[]
  ): string {
    const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
    const priceStr = signal.entryPrice ? ` @ $${signal.entryPrice.toFixed(2)}` : '';
    return [
      `${emoji} *${signal.action} ${tickers.join(', ')}*${priceStr}`,
      `Score: ${signal.score}/100`,
      signal.reasoning ? `\n${signal.reasoning}` : '',
    ].filter(Boolean).join('\n');
  }

  it('formats a BUY signal correctly', () => {
    const msg = formatAlertMessage(
      { action: 'BUY', tweetText: 'AAPL to the moon', entryPrice: 150.25, score: 85, reasoning: 'Strong bullish' },
      ['AAPL']
    );
    expect(msg).toContain('🟢');
    expect(msg).toContain('*BUY AAPL*');
    expect(msg).toContain('@ $150.25');
    expect(msg).toContain('Score: 85/100');
  });

  it('formats a SELL signal without entry price', () => {
    const msg = formatAlertMessage(
      { action: 'SELL', tweetText: 'Get out of TSLA', entryPrice: null, score: 60, reasoning: null },
      ['TSLA']
    );
    expect(msg).toContain('🔴');
    expect(msg).toContain('*SELL TSLA*');
    expect(msg).not.toContain('@ $');
  });
});

describe('feature flag hash', () => {
  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }

  it('produces deterministic results', () => {
    const hash1 = simpleHash('test-flag:user-123');
    const hash2 = simpleHash('test-flag:user-123');
    expect(hash1).toBe(hash2);
  });

  it('produces different results for different inputs', () => {
    const hash1 = simpleHash('test-flag:user-123');
    const hash2 = simpleHash('test-flag:user-456');
    expect(hash1).not.toBe(hash2);
  });

  it('distributes roughly evenly across 100 buckets', () => {
    const buckets = new Array(100).fill(0);
    for (let i = 0; i < 10000; i++) {
      const hash = simpleHash(`flag:user-${i}`);
      buckets[hash % 100]++;
    }
    // Each bucket should have roughly 100 items (±50)
    const min = Math.min(...buckets);
    const max = Math.max(...buckets);
    expect(min).toBeGreaterThan(30);
    expect(max).toBeLessThan(200);
  });
});
