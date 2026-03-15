interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  shortName: string;
  marketState: string; // "REGULAR" | "PRE" | "POST" | "CLOSED"
}

export interface TickerEnrichment {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
  marketState: string;
}

/**
 * Get current quote data for a list of tickers.
 * Uses Yahoo Finance v7 quote endpoint.
 */
export async function getQuotes(tickers: string[]): Promise<Map<string, TickerEnrichment>> {
  const symbols = tickers.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Firasa/2.0' },
  });

  if (!res.ok) {
    throw new Error(`Yahoo quote error ${res.status}`);
  }

  const data = (await res.json()) as { quoteResponse: { result: YahooQuote[] } };
  const map = new Map<string, TickerEnrichment>();

  for (const q of data.quoteResponse.result) {
    map.set(q.symbol, {
      symbol: q.symbol,
      name: q.shortName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      marketCap: q.marketCap,
      high52w: q.fiftyTwoWeekHigh,
      low52w: q.fiftyTwoWeekLow,
      marketState: q.marketState,
    });
  }

  return map;
}

/**
 * Get price at a specific historical time using Yahoo chart API.
 * Returns the closest available bar's close price.
 */
export async function getPriceAtTime(
  ticker: string,
  targetTime: Date
): Promise<{ price: number; time: Date; afterHours: boolean } | null> {
  const now = Date.now();
  const target = targetTime.getTime();
  const rangeMs = now - target;

  // Determine range parameter based on how far back we need
  let range: string;
  if (rangeMs < 2 * 86400_000) range = '2d';
  else if (rangeMs < 5 * 86400_000) range = '5d';
  else if (rangeMs < 30 * 86400_000) range = '1mo';
  else range = '3mo';

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
    `?range=${range}&interval=5m&includePrePost=true`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Firasa/2.0' },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    chart: {
      result: [{
        timestamp: number[];
        indicators: { quote: [{ close: (number | null)[] }] };
      }];
    };
  };

  const result = data.chart.result?.[0];
  if (!result?.timestamp?.length) return null;

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const targetSec = Math.floor(target / 1000);

  // Find closest bar to target time
  let bestIdx = 0;
  let bestDiff = Math.abs(timestamps[0] - targetSec);

  for (let i = 1; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetSec);
    if (diff < bestDiff) {
      bestIdx = i;
      bestDiff = diff;
    }
  }

  const price = closes[bestIdx];
  if (price == null) return null;

  const barTime = new Date(timestamps[bestIdx] * 1000);
  const afterHours = !isMarketHours(barTime);

  return { price, time: barTime, afterHours };
}

/**
 * Get current price including after-hours data.
 * Uses the last available bar from chart data with prepost enabled.
 */
export async function getCurrentPrice(
  ticker: string
): Promise<{ price: number; afterHours: boolean } | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}` +
    `?range=2d&interval=5m&includePrePost=true`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Firasa/2.0' },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    chart: {
      result: [{
        timestamp: number[];
        indicators: { quote: [{ close: (number | null)[] }] };
      }];
    };
  };

  const result = data.chart.result?.[0];
  if (!result?.timestamp?.length) return null;

  const closes = result.indicators.quote[0].close;

  // Walk backwards to find last non-null close
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) {
      const barTime = new Date(result.timestamp[i] * 1000);
      return {
        price: closes[i]!,
        afterHours: !isMarketHours(barTime),
      };
    }
  }

  return null;
}

/** Check if a given time is during US market hours (9:30 AM – 4:00 PM ET) */
function isMarketHours(date: Date): boolean {
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false; // Weekend

  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  return timeMinutes >= 570 && timeMinutes < 960; // 9:30 AM to 4:00 PM
}
