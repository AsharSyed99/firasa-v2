import { getDb } from './database.js';

export interface ConvergenceAlert {
  ticker: string;
  guruCount: number;
  gurus: { handle: string; name: string; action: string; score: number; tweetId: string }[];
  dominantAction: 'BUY' | 'SELL' | 'HOLD';
  avgScore: number;
  convergenceScore: number; // 0-100, higher = stronger consensus
  timeWindowMinutes: number;
  detectedAt: string;
}

/**
 * Detect convergence: multiple gurus mentioning the same ticker in a time window.
 * This is the "secret sauce" — when 3+ independent gurus all say BUY $NVDA
 * within 2 hours, that's a much stronger signal than one guru alone.
 */
export async function detectConvergence(
  windowMinutes = 120,
  minGurus = 2
): Promise<ConvergenceAlert[]> {
  const db = getDb();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Get all recent signals
  const recentSignals = await db.signal.findMany({
    where: { createdAt: { gte: since } },
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Group by ticker
  const tickerGroups = new Map<string, typeof recentSignals>();

  for (const signal of recentSignals) {
    const tickers: string[] = JSON.parse(signal.tickers as string);
    for (const ticker of tickers) {
      const existing = tickerGroups.get(ticker) ?? [];
      existing.push(signal);
      tickerGroups.set(ticker, existing);
    }
  }

  const alerts: ConvergenceAlert[] = [];

  for (const [ticker, signals] of tickerGroups) {
    // Deduplicate by guru (take latest signal per guru)
    const guruMap = new Map<string, (typeof signals)[0]>();
    for (const s of signals) {
      if (!guruMap.has(s.guruId)) {
        guruMap.set(s.guruId, s);
      }
    }

    const uniqueGurus = [...guruMap.values()];
    if (uniqueGurus.length < minGurus) continue;

    // Count actions
    const actionCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    for (const s of uniqueGurus) {
      const action = s.action as keyof typeof actionCounts;
      if (action in actionCounts) actionCounts[action]++;
    }

    const dominantAction = (Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)[0][0]) as 'BUY' | 'SELL' | 'HOLD';

    const dominantCount = actionCounts[dominantAction];
    const totalGurus = uniqueGurus.length;
    const avgScore = Math.round(uniqueGurus.reduce((sum, s) => sum + s.score, 0) / totalGurus);

    // Convergence score: how strong is the consensus?
    // Factors: number of agreeing gurus, agreement ratio, avg score
    const agreementRatio = dominantCount / totalGurus;
    const guruBonus = Math.min(totalGurus / 5, 1) * 30; // Up to 30 pts for 5+ gurus
    const agreementBonus = agreementRatio * 40; // Up to 40 pts for 100% agreement
    const scoreBonus = (avgScore / 100) * 30; // Up to 30 pts based on avg signal score
    const convergenceScore = Math.round(Math.min(guruBonus + agreementBonus + scoreBonus, 100));

    alerts.push({
      ticker,
      guruCount: totalGurus,
      gurus: uniqueGurus.map((s) => ({
        handle: s.guru.twitterHandle,
        name: s.guru.displayName,
        action: s.action,
        score: s.score,
        tweetId: s.tweetId,
      })),
      dominantAction,
      avgScore,
      convergenceScore,
      timeWindowMinutes: windowMinutes,
      detectedAt: new Date().toISOString(),
    });
  }

  // Sort by convergence score descending
  return alerts.sort((a, b) => b.convergenceScore - a.convergenceScore);
}
