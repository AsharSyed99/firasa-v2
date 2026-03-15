import { getDb } from './database.js';

export interface HeatmapEntry {
  ticker: string;
  mentions: number;
  avgSentiment: number;
  avgScore: number;
  topAction: string;
  gurus: string[];
}

const SENTIMENT_MAP: Record<string, number> = {
  BULLISH: 1,
  BEARISH: -1,
  NEUTRAL: 0,
  MIXED: 0,
};

/** Build a heatmap of trending tickers from recent signals */
export async function getTickerHeatmap(hours = 24): Promise<HeatmapEntry[]> {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const signals = await db.signal.findMany({
    where: { createdAt: { gte: since } },
    select: {
      tickers: true,
      sentiment: true,
      action: true,
      score: true,
      guru: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const tickerMap = new Map<string, {
    sentimentSum: number;
    scoreSum: number;
    count: number;
    actions: Record<string, number>;
    gurus: Set<string>;
  }>();

  for (const signal of signals) {
    const tickers = JSON.parse(signal.tickers) as string[];
    const sentimentVal = SENTIMENT_MAP[signal.sentiment] ?? 0;

    for (const ticker of tickers) {
      const key = ticker.toUpperCase();
      let entry = tickerMap.get(key);
      if (!entry) {
        entry = { sentimentSum: 0, scoreSum: 0, count: 0, actions: {}, gurus: new Set() };
        tickerMap.set(key, entry);
      }
      entry.sentimentSum += sentimentVal;
      entry.scoreSum += signal.score;
      entry.count += 1;
      entry.actions[signal.action] = (entry.actions[signal.action] ?? 0) + 1;
      entry.gurus.add(signal.guru.displayName);
    }
  }

  const results: HeatmapEntry[] = [];

  for (const [ticker, data] of tickerMap) {
    const topAction = Object.entries(data.actions)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'UNCLEAR';

    results.push({
      ticker,
      mentions: data.count,
      avgSentiment: Math.round((data.sentimentSum / data.count) * 100) / 100,
      avgScore: Math.round(data.scoreSum / data.count),
      topAction,
      gurus: [...data.gurus],
    });
  }

  results.sort((a, b) => b.mentions - a.mentions);
  return results.slice(0, 50);
}
