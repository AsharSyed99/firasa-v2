import { getDb } from './database.js';
import { getCurrentPrice } from '../providers/yahoo-finance.js';
import { TIER_LIMITS, type UserTier } from '@firasa/shared';

export interface WatchlistItemDto {
  id: string;
  ticker: string;
  addedAt: string;
  notes: string | null;
  currentPrice: number | null;
  dailyChangePercent: number | null;
  recentSignalCount: number;
}

export async function getWatchlist(userId: string): Promise<WatchlistItemDto[]> {
  const db = getDb();

  const items = await db.watchlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: 'desc' },
  });

  if (items.length === 0) return [];

  // Count recent signals (last 7 days) per ticker
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSignals = await db.signal.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { tickers: true },
  });

  const signalCountMap = new Map<string, number>();
  for (const signal of recentSignals) {
    try {
      const tickers: string[] = JSON.parse(signal.tickers);
      for (const t of tickers) {
        signalCountMap.set(t, (signalCountMap.get(t) ?? 0) + 1);
      }
    } catch {
      // skip malformed ticker JSON
    }
  }

  // Fetch live prices
  const priceMap = new Map<string, { price: number; prevClose: number | null }>();
  const uniqueTickers = [...new Set(items.map((i) => i.ticker))];

  for (const ticker of uniqueTickers) {
    try {
      const result = await getCurrentPrice(ticker);
      if (result?.price) {
        priceMap.set(ticker, { price: result.price, prevClose: null });
      }
    } catch {
      // skip failed lookups
    }
  }

  return items.map((item) => {
    const priceData = priceMap.get(item.ticker);
    return {
      id: item.id,
      ticker: item.ticker,
      addedAt: item.addedAt.toISOString(),
      notes: item.notes,
      currentPrice: priceData?.price ?? null,
      dailyChangePercent: null, // requires previous close from quote endpoint
      recentSignalCount: signalCountMap.get(item.ticker) ?? 0,
    };
  });
}

export async function addToWatchlist(
  userId: string,
  tier: UserTier,
  ticker: string,
  notes?: string
): Promise<void> {
  const db = getDb();
  const limits = TIER_LIMITS[tier];

  const count = await db.watchlistItem.count({ where: { userId } });
  if (count >= limits.maxWatchlistItems) {
    throw new WatchlistLimitError(
      `Watchlist limit reached (${limits.maxWatchlistItems}). Upgrade your plan for more.`
    );
  }

  await db.watchlistItem.create({
    data: {
      userId,
      ticker: ticker.toUpperCase().trim(),
      notes: notes ?? null,
    },
  });
}

export async function removeFromWatchlist(userId: string, ticker: string): Promise<void> {
  const db = getDb();
  await db.watchlistItem.delete({
    where: {
      userId_ticker: { userId, ticker: ticker.toUpperCase().trim() },
    },
  });
}

export class WatchlistLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WatchlistLimitError';
  }
}
