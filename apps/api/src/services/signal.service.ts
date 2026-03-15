import { getDb } from './database.js';
import type { SignalDto, SignalDetailDto, SignalOutcomeDto, TradeOutcomeDto } from '@firasa/shared';
import { TIMEFRAMES, type Timeframe } from '@firasa/shared';
import { getCurrentPrice } from '../providers/yahoo-finance.js';

/** List signals with pagination */
export async function listSignals(options: {
  guruId?: string;
  action?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ signals: SignalDto[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = options.limit ?? 20;

  const where: Record<string, unknown> = {};
  if (options.guruId) where.guruId = options.guruId;
  if (options.action) where.action = options.action;
  if (options.cursor) where.createdAt = { lt: new Date(options.cursor) };

  const signals = await db.signal.findMany({
    where,
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = signals.length > limit;
  const items = hasMore ? signals.slice(0, limit) : signals;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    signals: items.map((s) => mapSignalToDto(s, s.guru)),
    nextCursor,
  };
}

/** Get single signal with full details and outcomes */
export async function getSignalDetail(id: string): Promise<SignalDetailDto | null> {
  const db = getDb();
  const signal = await db.signal.findUnique({
    where: { id },
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
  });

  if (!signal) return null;

  const outcomes = buildOutcomes(signal);

  return {
    ...mapSignalToDto(signal, signal.guru),
    imageAnalysis: signal.imageAnalysis,
    outcomes,
  };
}

/** Get trade outcomes for the trade tracker view */
export async function getTradeOutcomes(options: {
  guruId?: string;
  limit?: number;
}): Promise<TradeOutcomeDto[]> {
  const db = getDb();

  const where: Record<string, unknown> = {
    action: { in: ['BUY', 'SELL'] },
    entryPrice: { not: null },
  };
  if (options.guruId) where.guruId = options.guruId;

  const signals = await db.signal.findMany({
    where,
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
  });

  const results: TradeOutcomeDto[] = [];

  for (const signal of signals) {
    const tickers = JSON.parse(signal.tickers) as string[];
    const ticker = tickers[0];

    let currentPrice: number | null = null;
    let currentAfterHours = false;

    if (ticker) {
      const priceData = await getCurrentPrice(ticker);
      if (priceData) {
        currentPrice = priceData.price;
        currentAfterHours = priceData.afterHours;
      }
    }

    const changePercent =
      signal.entryPrice && currentPrice
        ? ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100
        : null;

    results.push({
      signal: mapSignalToDto(signal, signal.guru),
      currentPrice,
      currentAfterHours,
      changePercent,
      outcomes: buildOutcomes(signal),
    });
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────

function buildOutcomes(signal: {
  entryPrice: number | null;
  price1hLater: number | null; outcome1h: string | null;
  price4hLater: number | null; outcome4h: string | null;
  price1dLater: number | null; outcome1d: string | null;
  price3dLater: number | null; outcome3d: string | null;
  price1wLater: number | null; outcome1w: string | null;
  price1mLater: number | null; outcome1m: string | null;
}): SignalOutcomeDto[] {
  const priceFields: Record<Timeframe, number | null> = {
    '1h': signal.price1hLater,
    '4h': signal.price4hLater,
    '1d': signal.price1dLater,
    '3d': signal.price3dLater,
    '1w': signal.price1wLater,
    '1m': signal.price1mLater,
  };

  const outcomeFields: Record<Timeframe, string | null> = {
    '1h': signal.outcome1h,
    '4h': signal.outcome4h,
    '1d': signal.outcome1d,
    '3d': signal.outcome3d,
    '1w': signal.outcome1w,
    '1m': signal.outcome1m,
  };

  return TIMEFRAMES.map((tf) => {
    const price = priceFields[tf];
    const outcome = outcomeFields[tf] as SignalOutcomeDto['outcome'];
    const changePercent =
      signal.entryPrice && price
        ? ((price - signal.entryPrice) / signal.entryPrice) * 100
        : null;

    return { timeframe: tf, price, outcome, changePercent };
  });
}

function mapSignalToDto(
  signal: {
    id: string; guruId: string; tweetId: string; tweetText: string;
    tweetCreatedAt: Date; tickers: string; action: string; sentiment: string;
    confidence: number; score: number; reasoning: string | null;
    entryPrice: number | null; afterHours: boolean; createdAt: Date;
  },
  guru: { twitterHandle: string; displayName: string }
): SignalDto {
  return {
    id: signal.id,
    guruId: signal.guruId,
    guruHandle: guru.twitterHandle,
    guruName: guru.displayName,
    tweetId: signal.tweetId,
    tweetText: signal.tweetText,
    tweetCreatedAt: signal.tweetCreatedAt.toISOString(),
    tickers: JSON.parse(signal.tickers),
    action: signal.action as SignalDto['action'],
    sentiment: signal.sentiment as SignalDto['sentiment'],
    confidence: signal.confidence,
    score: signal.score,
    reasoning: signal.reasoning,
    entryPrice: signal.entryPrice,
    afterHours: signal.afterHours,
    createdAt: signal.createdAt.toISOString(),
  };
}
