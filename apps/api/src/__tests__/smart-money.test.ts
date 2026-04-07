import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcConfirmationScore,
  buildSummary,
  type SmartMoneyConfirmation,
} from '../services/smart-money.service.js';

// ─── Helpers ─────────────────────────────────────────────────

function makeOptionsFlow(
  overrides: Partial<NonNullable<SmartMoneyConfirmation['optionsFlow']>> = {},
): SmartMoneyConfirmation['optionsFlow'] {
  return {
    bullishVolume: 5000,
    bearishVolume: 1000,
    netSentiment: 'BULLISH',
    unusualActivity: false,
    ...overrides,
  };
}

function makeDarkPool(
  overrides: Partial<NonNullable<SmartMoneyConfirmation['darkPool']>> = {},
): SmartMoneyConfirmation['darkPool'] {
  return { totalVolume: 500_000, largeBlockCount: 3, netDirection: 'BUY', ...overrides };
}

function makeCongress(
  action = 'Purchase',
): SmartMoneyConfirmation['congressTrades'] {
  return {
    recentTrades: [{ politician: 'Sen. Test', action, amount: '$50k-$100k', date: '2024-01-15' }],
  };
}

function makeInsider(
  action = 'Purchase',
): SmartMoneyConfirmation['insiderTrades'] {
  return {
    recentTrades: [{ name: 'Jane Doe', title: 'CEO', action, shares: 10_000, date: '2024-01-15' }],
  };
}

// ─── calcConfirmationScore ───────────────────────────────────

describe('calcConfirmationScore', () => {
  it('returns 0 when all data is null', () => {
    expect(calcConfirmationScore('BUY', null, null, null, null)).toBe(0);
  });

  it('adds 30 when options flow aligns with BUY', () => {
    const score = calcConfirmationScore('BUY', makeOptionsFlow(), null, null, null);
    expect(score).toBe(30);
  });

  it('adds 30 when options flow aligns with SELL', () => {
    const score = calcConfirmationScore(
      'SELL', makeOptionsFlow({ netSentiment: 'BEARISH' }), null, null, null,
    );
    expect(score).toBe(30);
  });

  it('does not add options points when sentiment does not align', () => {
    const score = calcConfirmationScore(
      'SELL', makeOptionsFlow({ netSentiment: 'BULLISH' }), null, null, null,
    );
    expect(score).toBe(0);
  });

  it('adds 15 for unusual activity', () => {
    const score = calcConfirmationScore(
      'BUY', makeOptionsFlow({ unusualActivity: true }), null, null, null,
    );
    expect(score).toBe(30 + 15);
  });

  it('adds 25 when dark pool aligns with BUY', () => {
    const score = calcConfirmationScore('BUY', null, makeDarkPool(), null, null);
    expect(score).toBe(25);
  });

  it('adds 20 when congress buys align with BUY', () => {
    const score = calcConfirmationScore('BUY', null, null, makeCongress('Purchase'), null);
    expect(score).toBe(20);
  });

  it('adds 10 when insider buys align with BUY', () => {
    const score = calcConfirmationScore('BUY', null, null, null, makeInsider('Purchase'));
    expect(score).toBe(10);
  });

  it('maxes out at 100', () => {
    const score = calcConfirmationScore(
      'BUY',
      makeOptionsFlow({ unusualActivity: true }),
      makeDarkPool(),
      makeCongress('Purchase'),
      makeInsider('Purchase'),
    );
    expect(score).toBe(100);
  });

  it('returns 0 for HOLD action (no alignment logic)', () => {
    const score = calcConfirmationScore(
      'HOLD',
      makeOptionsFlow(),
      makeDarkPool(),
      makeCongress('Purchase'),
      makeInsider('Purchase'),
    );
    expect(score).toBe(0);
  });
});

// ─── buildSummary ────────────────────────────────────────────

describe('buildSummary', () => {
  it('returns strong confirmation text for high scores', () => {
    const summary = buildSummary('AAPL', 'BUY', 75, makeOptionsFlow(), makeDarkPool());
    expect(summary).toContain('Strong institutional confirmation');
    expect(summary).toContain('$AAPL');
  });

  it('returns moderate text for mid scores', () => {
    const summary = buildSummary('TSLA', 'SELL', 45, null, null);
    expect(summary).toContain('Moderate institutional support');
  });

  it('returns limited text for low scores', () => {
    const summary = buildSummary('GME', 'BUY', 10, null, null);
    expect(summary).toContain('Limited institutional data');
  });

  it('includes options flow sentiment', () => {
    const summary = buildSummary('AAPL', 'BUY', 50, makeOptionsFlow(), null);
    expect(summary).toContain('bullish');
  });

  it('notes unusual activity in options flow', () => {
    const summary = buildSummary('AAPL', 'BUY', 50, makeOptionsFlow({ unusualActivity: true }), null);
    expect(summary).toContain('unusual activity');
  });

  it('includes dark pool direction', () => {
    const summary = buildSummary('AAPL', 'BUY', 50, null, makeDarkPool());
    expect(summary).toContain('BUY');
  });
});

// ─── Graceful degradation ────────────────────────────────────

describe('graceful degradation', () => {
  it('confirmation score is 0 when all UW data is null', () => {
    const score = calcConfirmationScore('BUY', null, null, null, null);
    expect(score).toBe(0);
  });

  it('summary still works with all null data', () => {
    const summary = buildSummary('AAPL', 'BUY', 0, null, null);
    expect(summary).toBeTruthy();
    expect(summary).toContain('AAPL');
  });
});

// ─── Caching (provider-level) ────────────────────────────────

describe('provider caching', () => {
  beforeEach(async () => {
    const { clearCache } = await import('../providers/unusual-whales.js');
    clearCache();
  });

  it('clearCache resets cache size to 0', async () => {
    const { getCacheSize, clearCache } = await import('../providers/unusual-whales.js');
    clearCache();
    expect(getCacheSize()).toBe(0);
  });
});
