import { describe, it, expect } from 'vitest';

describe('pipeline helpers', () => {
  const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;
  const TICKER_BLACKLIST = new Set(['I', 'A', 'AM', 'PM', 'US', 'CEO', 'IPO', 'ETF', 'AI']);

  function extractTickers(text: string): string[] {
    const matches = [...text.matchAll(TICKER_REGEX)];
    const tickers = new Set<string>();
    for (const match of matches) {
      const ticker = match[1];
      if (!TICKER_BLACKLIST.has(ticker)) {
        tickers.add(ticker);
      }
    }
    return [...tickers];
  }

  it('extracts tickers from tweet text', () => {
    expect(extractTickers('$AAPL looking strong')).toEqual(['AAPL']);
    expect(extractTickers('$TSLA and $NVDA both bullish')).toEqual(['TSLA', 'NVDA']);
    expect(extractTickers('No tickers here')).toEqual([]);
  });

  it('filters out blacklisted symbols', () => {
    expect(extractTickers('$I am bullish on $AI and $AAPL')).toEqual(['AAPL']);
    expect(extractTickers('$CEO said $IPO will $ETF')).toEqual([]);
  });

  it('deduplicates tickers', () => {
    expect(extractTickers('$AAPL up $AAPL strong')).toEqual(['AAPL']);
  });

  it('handles mixed case correctly (only uppercase)', () => {
    expect(extractTickers('$aapl wont match')).toEqual([]);
    expect(extractTickers('$AAPL matches')).toEqual(['AAPL']);
  });
});
