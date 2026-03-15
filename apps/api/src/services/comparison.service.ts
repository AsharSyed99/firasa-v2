import { getDb } from './database.js';

export interface GuruComparisonStats {
  guruId: string;
  displayName: string;
  twitterHandle: string;
  winRate: number;
  avgScore: number;
  totalSignals: number;
  streak: number;
  topTickers: { ticker: string; count: number }[];
  actionBreakdown: { BUY: number; SELL: number; HOLD: number };
}

export interface ComparisonResult {
  guru1: GuruComparisonStats;
  guru2: GuruComparisonStats;
  sharedTickers: string[];
  agreementRate: number;
  agreements: { ticker: string; action: string }[];
  disagreements: { ticker: string; action1: string; action2: string }[];
}

async function getGuruStats(guruId: string, since: Date): Promise<GuruComparisonStats | null> {
  const db = getDb();
  const guru = await db.guru.findUnique({ where: { id: guruId } });
  if (!guru) return null;

  const signals = await db.signal.findMany({
    where: { guruId, createdAt: { gte: since } },
    select: { score: true, action: true, tickers: true, outcome1d: true },
    orderBy: { createdAt: 'desc' },
  });

  const total = signals.length;
  const wins = signals.filter((s) => s.outcome1d === 'WIN').length;
  const scored = signals.filter((s) => s.outcome1d !== null).length;
  const winRate = scored > 0 ? Math.round((wins / scored) * 100 * 10) / 10 : 0;
  const avgScore = total > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.score, 0) / total)
    : 0;

  let streak = 0;
  for (const s of signals) {
    if (s.score >= 70) streak++;
    else break;
  }

  // Count tickers
  const tickerCounts = new Map<string, number>();
  for (const s of signals) {
    const tickers: string[] = JSON.parse(s.tickers as string);
    for (const t of tickers) {
      tickerCounts.set(t, (tickerCounts.get(t) ?? 0) + 1);
    }
  }
  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker, count]) => ({ ticker, count }));

  const actionBreakdown = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const s of signals) {
    const action = s.action as keyof typeof actionBreakdown;
    if (action in actionBreakdown) actionBreakdown[action]++;
  }

  return {
    guruId: guru.id,
    displayName: guru.displayName,
    twitterHandle: guru.twitterHandle,
    winRate,
    avgScore,
    totalSignals: total,
    streak,
    topTickers,
    actionBreakdown,
  };
}

export async function compareGurus(
  guruId1: string,
  guruId2: string,
  days: number = 30
): Promise<ComparisonResult | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [guru1, guru2] = await Promise.all([
    getGuruStats(guruId1, since),
    getGuruStats(guruId2, since),
  ]);

  if (!guru1 || !guru2) return null;

  // Find shared tickers and agreement
  const db = getDb();
  const [signals1, signals2] = await Promise.all([
    db.signal.findMany({
      where: { guruId: guruId1, createdAt: { gte: since } },
      select: { tickers: true, action: true },
    }),
    db.signal.findMany({
      where: { guruId: guruId2, createdAt: { gte: since } },
      select: { tickers: true, action: true },
    }),
  ]);

  // Build latest action per ticker for each guru
  const tickerAction1 = new Map<string, string>();
  const tickerAction2 = new Map<string, string>();
  for (const s of signals1) {
    for (const t of JSON.parse(s.tickers as string) as string[]) {
      if (!tickerAction1.has(t)) tickerAction1.set(t, s.action);
    }
  }
  for (const s of signals2) {
    for (const t of JSON.parse(s.tickers as string) as string[]) {
      if (!tickerAction2.has(t)) tickerAction2.set(t, s.action);
    }
  }

  const sharedTickers = [...tickerAction1.keys()].filter((t) => tickerAction2.has(t));
  const agreements: ComparisonResult['agreements'] = [];
  const disagreements: ComparisonResult['disagreements'] = [];

  for (const ticker of sharedTickers) {
    const a1 = tickerAction1.get(ticker)!;
    const a2 = tickerAction2.get(ticker)!;
    if (a1 === a2) agreements.push({ ticker, action: a1 });
    else disagreements.push({ ticker, action1: a1, action2: a2 });
  }

  const agreementRate = sharedTickers.length > 0
    ? Math.round((agreements.length / sharedTickers.length) * 100)
    : 0;

  return { guru1, guru2, sharedTickers, agreementRate, agreements, disagreements };
}
