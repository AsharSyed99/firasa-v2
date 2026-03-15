import { getDb } from './database.js';
import { getUpcomingEarnings, type EarningsEvent } from '../providers/earnings.js';

export interface EarningsCalendarEntry {
  ticker: string;
  earningsDate: string;
  daysUntil: number;
  hour: string;
  hasRecentSignal: boolean;
  recentSignalAction: string | null;
  recentSignalScore: number | null;
  nearEarningsWarning: boolean;
}

const NEAR_EARNINGS_DAYS = 3;

/**
 * Fetch earnings calendar for all tickers that have recent signals.
 * Flags signals near earnings with a warning.
 */
export async function getEarningsCalendar(
  daysAhead: number = 14
): Promise<EarningsCalendarEntry[]> {
  const recentSignals = await getRecentSignalTickers();

  if (recentSignals.length === 0) return [];

  const tickers = recentSignals.map((s) => s.ticker);
  const earnings = await getUpcomingEarnings(tickers, daysAhead);

  if (earnings.length === 0) return [];

  const signalMap = new Map(recentSignals.map((s) => [s.ticker, s]));
  const now = new Date();

  const entries: EarningsCalendarEntry[] = earnings.map((e) =>
    buildEntry(e, signalMap, now)
  );

  entries.sort(
    (a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime()
  );

  return entries;
}

function buildEntry(
  e: EarningsEvent,
  signalMap: Map<string, RecentSignal>,
  now: Date
): EarningsCalendarEntry {
  const earningsDate = new Date(e.date);
  const daysUntil = Math.ceil(
    (earningsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const signal = signalMap.get(e.symbol.toUpperCase());

  return {
    ticker: e.symbol,
    earningsDate: e.date,
    daysUntil: Math.max(0, daysUntil),
    hour: e.hour === 'bmo' ? 'BMO' : e.hour === 'amc' ? 'AMC' : e.hour.toUpperCase(),
    hasRecentSignal: !!signal,
    recentSignalAction: signal?.action ?? null,
    recentSignalScore: signal?.score ?? null,
    nearEarningsWarning: !!signal && daysUntil <= NEAR_EARNINGS_DAYS,
  };
}

// ─── Internal helpers ────────────────────────────────────────

interface RecentSignal {
  ticker: string;
  action: string;
  score: number;
}

/**
 * Get tickers with signals from the last 14 days, keeping the most recent
 * signal per ticker. Only returns actionable signals (BUY/SELL).
 */
async function getRecentSignalTickers(): Promise<RecentSignal[]> {
  const db = getDb();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const signals = await db.signal.findMany({
    where: {
      createdAt: { gte: fourteenDaysAgo },
      action: { in: ['BUY', 'SELL'] },
    },
    select: {
      tickers: true,
      action: true,
      score: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const tickerMap = new Map<string, RecentSignal>();

  for (const signal of signals) {
    const parsedTickers = JSON.parse(signal.tickers) as string[];
    for (const t of parsedTickers) {
      const upper = t.toUpperCase();
      if (!tickerMap.has(upper)) {
        tickerMap.set(upper, {
          ticker: upper,
          action: signal.action,
          score: signal.score,
        });
      }
    }
  }

  return Array.from(tickerMap.values());
}
