import { getDb } from './database.js';
import type { SignalDto, GuruDto } from '@firasa/shared';

export interface TickerResult {
  ticker: string;
  signalCount: number;
  lastMentioned: string;
}

export interface SearchResults {
  signals: SignalDto[];
  gurus: GuruDto[];
  tickers: TickerResult[];
}

type SearchType = 'signals' | 'gurus' | 'tickers';

const LIMIT = 10;

/** Search across signals, gurus, and tickers. */
export async function search(
  query: string,
  type?: SearchType
): Promise<SearchResults> {
  const q = query.trim();
  const results: SearchResults = { signals: [], gurus: [], tickers: [] };

  const all = !type || type === 'signals';
  const allOrGurus = !type || type === 'gurus';
  const allOrTickers = !type || type === 'tickers';

  const jobs: Promise<void>[] = [];

  if (all) jobs.push(searchSignals(q).then((s) => { results.signals = s; }));
  if (allOrGurus) jobs.push(searchGurus(q).then((g) => { results.gurus = g; }));
  if (allOrTickers) jobs.push(searchTickers(q).then((t) => { results.tickers = t; }));

  await Promise.all(jobs);
  return results;
}

// ─── Signal search: tweetText + tickers LIKE %query% ────────

async function searchSignals(q: string): Promise<SignalDto[]> {
  const db = getDb();

  const signals = await db.signal.findMany({
    where: {
      OR: [
        { tweetText: { contains: q } },
        { tickers: { contains: q.toUpperCase() } },
      ],
    },
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
  });

  return signals.map((s) => ({
    id: s.id,
    guruId: s.guruId,
    guruHandle: s.guru.twitterHandle,
    guruName: s.guru.displayName,
    tweetId: s.tweetId,
    tweetText: s.tweetText,
    tweetCreatedAt: s.tweetCreatedAt.toISOString(),
    tickers: JSON.parse(s.tickers) as string[],
    action: s.action as SignalDto['action'],
    sentiment: s.sentiment as SignalDto['sentiment'],
    confidence: s.confidence,
    score: s.score,
    reasoning: s.reasoning,
    entryPrice: s.entryPrice,
    afterHours: s.afterHours,
    createdAt: s.createdAt.toISOString(),
  }));
}

// ─── Guru search: displayName + twitterHandle ────────────────

async function searchGurus(q: string): Promise<GuruDto[]> {
  const db = getDb();

  const gurus = await db.guru.findMany({
    where: {
      isActive: true,
      OR: [
        { displayName: { contains: q } },
        { twitterHandle: { contains: q } },
      ],
    },
    orderBy: { displayName: 'asc' },
    take: LIMIT,
  });

  return gurus.map((g) => ({
    id: g.id,
    twitterHandle: g.twitterHandle,
    displayName: g.displayName,
    category: g.category as GuruDto['category'],
    reliability: g.reliability,
    isActive: g.isActive,
    totalSignals: g.totalSignals,
    profitableSignals: g.profitableSignals,
    avgScore: g.avgScore,
    lastPolledAt: g.lastPolledAt?.toISOString() ?? null,
    winRates: [],
  }));
}

// ─── Ticker search: distinct tickers from signals ────────────

async function searchTickers(q: string): Promise<TickerResult[]> {
  const db = getDb();
  const upper = q.toUpperCase();

  const signals = await db.signal.findMany({
    where: { tickers: { contains: upper } },
    select: { tickers: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const tickerMap = new Map<string, { count: number; lastMentioned: Date }>();

  for (const s of signals) {
    const parsed = JSON.parse(s.tickers) as string[];
    for (const t of parsed) {
      if (!t.toUpperCase().includes(upper)) continue;
      const existing = tickerMap.get(t);
      if (existing) {
        existing.count++;
        if (s.createdAt > existing.lastMentioned) existing.lastMentioned = s.createdAt;
      } else {
        tickerMap.set(t, { count: 1, lastMentioned: s.createdAt });
      }
    }
  }

  return Array.from(tickerMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, LIMIT)
    .map(([ticker, data]) => ({
      ticker,
      signalCount: data.count,
      lastMentioned: data.lastMentioned.toISOString(),
    }));
}
