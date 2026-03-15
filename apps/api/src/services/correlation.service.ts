import { getDb } from './database.js';

interface GuruInfo {
  id: string;
  handle: string;
  name: string;
}

export interface GuruCorrelation {
  guru1: GuruInfo;
  guru2: GuruInfo;
  sharedTickers: number;
  agreements: number;
  disagreements: number;
  correlation: number;
}

interface TickerAction {
  ticker: string;
  action: string;
}

/**
 * For each pair of active gurus, calculate how often they agree/disagree
 * on the same tickers within the given time window.
 */
export async function getGuruCorrelations(days: number = 30): Promise<GuruCorrelation[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const gurus = await db.guru.findMany({
    where: { isActive: true },
    select: { id: true, twitterHandle: true, displayName: true },
  });

  // Fetch signals in time window with actionable actions only
  const signals = await db.signal.findMany({
    where: {
      createdAt: { gte: since },
      action: { in: ['BUY', 'SELL'] },
      guruId: { in: gurus.map((g) => g.id) },
    },
    select: { guruId: true, tickers: true, action: true },
  });

  // Build map: guruId -> [{ ticker, action }]
  const guruActions = new Map<string, TickerAction[]>();
  for (const sig of signals) {
    const tickers: string[] = JSON.parse(sig.tickers);
    const entries = guruActions.get(sig.guruId) ?? [];
    for (const ticker of tickers) {
      entries.push({ ticker: ticker.toUpperCase(), action: sig.action });
    }
    guruActions.set(sig.guruId, entries);
  }

  // For each guru, build ticker -> dominant action (most frequent BUY or SELL)
  const guruTickerAction = new Map<string, Map<string, string>>();
  for (const [guruId, actions] of guruActions) {
    const tickerCounts = new Map<string, { BUY: number; SELL: number }>();
    for (const { ticker, action } of actions) {
      const counts = tickerCounts.get(ticker) ?? { BUY: 0, SELL: 0 };
      if (action === 'BUY') counts.BUY++;
      else counts.SELL++;
      tickerCounts.set(ticker, counts);
    }
    const dominant = new Map<string, string>();
    for (const [ticker, counts] of tickerCounts) {
      dominant.set(ticker, counts.BUY >= counts.SELL ? 'BUY' : 'SELL');
    }
    guruTickerAction.set(guruId, dominant);
  }

  const guruMap = new Map(gurus.map((g) => [g.id, g]));
  const results: GuruCorrelation[] = [];

  // Compare every pair
  for (let i = 0; i < gurus.length; i++) {
    for (let j = i + 1; j < gurus.length; j++) {
      const g1 = gurus[i];
      const g2 = gurus[j];
      const map1 = guruTickerAction.get(g1.id);
      const map2 = guruTickerAction.get(g2.id);
      if (!map1 || !map2) continue;

      let agreements = 0;
      let disagreements = 0;
      const shared = new Set<string>();

      for (const [ticker, action1] of map1) {
        const action2 = map2.get(ticker);
        if (!action2) continue;
        shared.add(ticker);
        if (action1 === action2) agreements++;
        else disagreements++;
      }

      if (shared.size < 2) continue;

      const total = agreements + disagreements;
      const correlation = total > 0
        ? Math.round(((agreements - disagreements) / total) * 100) / 100
        : 0;

      const guru = guruMap.get(g1.id)!;
      const guru2 = guruMap.get(g2.id)!;
      results.push({
        guru1: { id: guru.id, handle: guru.twitterHandle, name: guru.displayName },
        guru2: { id: guru2.id, handle: guru2.twitterHandle, name: guru2.displayName },
        sharedTickers: shared.size,
        agreements,
        disagreements,
        correlation,
      });
    }
  }

  // Sort by absolute correlation descending (strongest relationships first)
  results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  return results;
}
