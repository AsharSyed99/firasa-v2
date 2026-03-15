import { getEnv } from '../config/env.js';

interface FinnhubEarningsEntry {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface FinnhubEarningsResponse {
  earningsCalendar: FinnhubEarningsEntry[];
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  hour: string;
  quarter: number;
  year: number;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
}

/**
 * Fetch upcoming earnings for specific tickers from Finnhub.
 * Returns only entries matching the requested tickers.
 */
export async function getUpcomingEarnings(
  tickers: string[],
  daysAhead: number
): Promise<EarningsEvent[]> {
  if (tickers.length === 0) return [];

  const env = getEnv();
  const from = formatDate(new Date());
  const to = formatDate(addDays(new Date(), daysAhead));

  try {
    const url =
      `https://finnhub.io/api/v1/calendar/earnings` +
      `?from=${from}&to=${to}&token=${env.FINNHUB_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as FinnhubEarningsResponse;
    if (!data.earningsCalendar) return [];

    const tickerSet = new Set(tickers.map((t) => t.toUpperCase()));

    return data.earningsCalendar
      .filter((e) => tickerSet.has(e.symbol.toUpperCase()))
      .map((e) => ({
        symbol: e.symbol,
        date: e.date,
        hour: e.hour,
        quarter: e.quarter,
        year: e.year,
        epsEstimate: e.epsEstimate,
        epsActual: e.epsActual,
        revenueEstimate: e.revenueEstimate,
        revenueActual: e.revenueActual,
      }));
  } catch (err) {
    console.error('Finnhub earnings calendar fetch failed:', err);
    return [];
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}
