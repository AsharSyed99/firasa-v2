import { getDb } from './database.js';
import type { UserTier } from '@firasa/shared';
import { TIER_LIMITS } from '@firasa/shared';

// ─── CSV helpers ─────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// ─── Signals export ──────────────────────────────────────────

export interface ExportSignalOptions {
  dateRange?: { from: string; to: string };
  guruIds?: string[];
  actions?: string[];
}

export async function exportSignals(
  userId: string,
  tier: UserTier,
  options: ExportSignalOptions
): Promise<string> {
  const db = getDb();
  const limits = TIER_LIMITS[tier];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.historyDays);

  const where: Record<string, unknown> = {
    createdAt: { gte: cutoff },
  };

  if (options.dateRange) {
    where.createdAt = {
      gte: new Date(Math.max(new Date(options.dateRange.from).getTime(), cutoff.getTime())),
      lte: new Date(options.dateRange.to),
    };
  }
  if (options.guruIds?.length) where.guruId = { in: options.guruIds };
  if (options.actions?.length) where.action = { in: options.actions };

  const signals = await db.signal.findMany({
    where,
    include: { guru: { select: { twitterHandle: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const headers = [
    'Date', 'Guru', 'Tickers', 'Action', 'Sentiment',
    'Score', 'Confidence', 'Entry Price', 'Outcome 1d', 'Outcome 1w',
  ];

  const rows = signals.map((s) => [
    s.tweetCreatedAt.toISOString(),
    s.guru.twitterHandle,
    JSON.parse(s.tickers).join('; '),
    s.action,
    s.sentiment,
    s.score,
    s.confidence,
    s.entryPrice,
    s.outcome1d,
    s.outcome1w,
  ]);

  return buildCsv(headers, rows);
}

// ─── Portfolio export ────────────────────────────────────────

export async function exportPortfolio(userId: string): Promise<string> {
  const db = getDb();

  const positions = await db.portfolioPosition.findMany({
    where: { userId },
    orderBy: { openedAt: 'desc' },
  });

  const headers = [
    'Ticker', 'Shares', 'Avg Cost', 'Opened At',
    'Closed At', 'Close Price', 'Total Cost', 'Realized P&L', 'Signal ID',
  ];

  const rows = positions.map((p) => {
    const totalCost = p.shares * p.avgCost;
    const realizedPnl = p.closedAt && p.closePrice
      ? (p.closePrice - p.avgCost) * p.shares
      : null;

    return [
      p.ticker,
      p.shares,
      p.avgCost,
      p.openedAt.toISOString(),
      p.closedAt?.toISOString() ?? '',
      p.closePrice,
      Math.round(totalCost * 100) / 100,
      realizedPnl != null ? Math.round(realizedPnl * 100) / 100 : '',
      p.linkedSignalId ?? '',
    ];
  });

  return buildCsv(headers, rows);
}

// ─── Trade history export ────────────────────────────────────

export async function exportTradeHistory(userId: string, tier: UserTier): Promise<string> {
  const db = getDb();
  const limits = TIER_LIMITS[tier];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.historyDays);

  // Get user's followed guru IDs to scope trade history
  const configs = await db.userGuruConfig.findMany({
    where: { userId, isFollowing: true },
    select: { guruId: true },
  });
  const guruIds = configs.map((c) => c.guruId);

  const signals = await db.signal.findMany({
    where: {
      guruId: { in: guruIds },
      action: { in: ['BUY', 'SELL'] },
      entryPrice: { not: null },
      createdAt: { gte: cutoff },
    },
    include: { guru: { select: { twitterHandle: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const headers = [
    'Date', 'Guru', 'Ticker', 'Action', 'Entry Price', 'Score',
    'Outcome 1h', 'Price 1h', 'Outcome 4h', 'Price 4h',
    'Outcome 1d', 'Price 1d', 'Outcome 1w', 'Price 1w',
  ];

  const rows = signals.map((s) => {
    const ticker = (JSON.parse(s.tickers) as string[])[0] ?? '';
    return [
      s.tweetCreatedAt.toISOString(),
      s.guru.twitterHandle,
      ticker,
      s.action,
      s.entryPrice,
      s.score,
      s.outcome1h, s.price1hLater,
      s.outcome4h, s.price4hLater,
      s.outcome1d, s.price1dLater,
      s.outcome1w, s.price1wLater,
    ];
  });

  return buildCsv(headers, rows);
}
