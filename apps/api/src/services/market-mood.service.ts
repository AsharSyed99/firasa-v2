import { getDb } from './database.js';

export interface MarketMood {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  topBullishTickers: string[];
  topBearishTickers: string[];
  guruConsensus: { bullish: number; bearish: number; total: number };
  summary: string;
  signalVolume: 'high' | 'normal' | 'low';
  generatedAt: string;
}

/**
 * Generate a daily market mood snapshot from last 24h of signals.
 */
export async function generateDailyMood(): Promise<MarketMood> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch signals from last 24 hours
  const signals = await db.signal.findMany({
    where: { createdAt: { gte: since } },
    include: { guru: { select: { id: true, displayName: true } } },
  });

  // Fetch 7-day count for volume comparison
  const weekSignals = await db.signal.count({
    where: { createdAt: { gte: weekAgo } },
  });

  const dailyAvg = weekSignals / 7;
  const todayCount = signals.length;

  // Signal volume classification
  let signalVolume: MarketMood['signalVolume'] = 'normal';
  if (dailyAvg > 0) {
    const ratio = todayCount / dailyAvg;
    if (ratio >= 1.5) signalVolume = 'high';
    else if (ratio <= 0.5) signalVolume = 'low';
  } else if (todayCount > 0) {
    signalVolume = 'high';
  }

  // Score each signal: BUY/BULLISH = positive, SELL/BEARISH = negative
  const tickerScores = new Map<string, number>();
  const guruDirections = new Map<string, 'bullish' | 'bearish'>();
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = Math.max(signal.score, 1);
    const direction = getDirection(signal.action, signal.sentiment);
    const dirValue = direction === 'bullish' ? 1 : direction === 'bearish' ? -1 : 0;

    totalWeightedScore += dirValue * weight;
    totalWeight += weight;

    // Track per-ticker scores
    const tickers = JSON.parse(signal.tickers) as string[];
    for (const ticker of tickers) {
      const current = tickerScores.get(ticker) ?? 0;
      tickerScores.set(ticker, current + dirValue * weight);
    }

    // Track guru consensus (use their last/strongest signal direction)
    if (direction !== 'neutral') {
      guruDirections.set(signal.guru.id, direction);
    }
  }

  // Calculate sentiment score (-100 to 100)
  const sentimentScore = totalWeight > 0
    ? Math.round(Math.max(-100, Math.min(100, (totalWeightedScore / totalWeight) * 100)))
    : 0;

  const overallSentiment: MarketMood['overallSentiment'] =
    sentimentScore > 15 ? 'bullish' : sentimentScore < -15 ? 'bearish' : 'neutral';

  // Sort tickers by score
  const sorted = [...tickerScores.entries()].sort((a, b) => b[1] - a[1]);
  const topBullishTickers = sorted.filter(([, s]) => s > 0).slice(0, 5).map(([t]) => t);
  const topBearishTickers = sorted.filter(([, s]) => s < 0).slice(0, 5).map(([t]) => t);

  // Guru consensus
  const bullishGurus = [...guruDirections.values()].filter((d) => d === 'bullish').length;
  const bearishGurus = [...guruDirections.values()].filter((d) => d === 'bearish').length;
  const totalGurus = guruDirections.size;

  const summary = buildSummary(overallSentiment, sentimentScore, todayCount, totalGurus, bullishGurus, topBullishTickers);

  return {
    overallSentiment,
    sentimentScore,
    topBullishTickers,
    topBearishTickers,
    guruConsensus: { bullish: bullishGurus, bearish: bearishGurus, total: totalGurus },
    summary,
    signalVolume,
    generatedAt: new Date().toISOString(),
  };
}

function getDirection(action: string, sentiment: string): 'bullish' | 'bearish' | 'neutral' {
  if (action === 'BUY' || sentiment === 'BULLISH') return 'bullish';
  if (action === 'SELL' || sentiment === 'BEARISH') return 'bearish';
  return 'neutral';
}

function buildSummary(
  mood: string,
  score: number,
  signalCount: number,
  totalGurus: number,
  bullishGurus: number,
  topTickers: string[]
): string {
  if (signalCount === 0) return 'No signals in the last 24 hours.';

  const strength = Math.abs(score) > 60 ? 'strongly' : Math.abs(score) > 30 ? 'moderately' : 'slightly';
  const tickerStr = topTickers.length > 0 ? ` led by $${topTickers.slice(0, 3).join(', $')}` : '';
  const consensus = totalGurus > 0 ? ` ${bullishGurus} of ${totalGurus} gurus leaning bullish.` : '';

  return `Market is ${strength} ${mood}${tickerStr}.${consensus} (${signalCount} signals today)`;
}
