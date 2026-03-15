import { getDb } from './database.js';

export interface WeeklyReport {
  weekStartDate: string;
  weekEndDate: string;
  signalsReceived: number;
  tradesOpened: number;
  tradesClosed: number;
  weekPnl: number;
  weekPnlPercent: number;
  bestTrade: { ticker: string; returnPercent: number } | null;
  worstTrade: { ticker: string; returnPercent: number } | null;
  guruOfTheWeek: { name: string; handle: string; accuracy: number } | null;
  topSectors: { sector: string; signalCount: number }[];
  streakStatus: { current: number; best: number };
  weekOverWeekChange: number;
}

function getWeekBounds(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday - offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function getWeekPnl(userId: string, start: Date, end: Date) {
  const db = getDb();
  const positions = await db.portfolioPosition.findMany({
    where: { userId, closedAt: { gte: start, lte: end } },
    select: { avgCost: true, closePrice: true, shares: true, ticker: true },
  });
  const trades = positions.map((p) => ({
    ticker: p.ticker,
    pnl: p.closePrice ? (p.closePrice - p.avgCost) * p.shares : 0,
    pnlPercent: p.closePrice && p.avgCost > 0 ? ((p.closePrice - p.avgCost) / p.avgCost) * 100 : 0,
  }));
  const pnl = trades.reduce((sum: number, t) => sum + t.pnl, 0);
  const pnlPct = trades.length > 0
    ? trades.reduce((sum: number, t) => sum + t.pnlPercent, 0) / trades.length
    : 0;
  return { pnl, pnlPct, trades };
}

export async function generateWeeklyReport(userId: string): Promise<WeeklyReport> {
  const db = getDb();
  const { start, end } = getWeekBounds(0);
  const prev = getWeekBounds(1);

  // Signals received this week
  const signalsReceived = await db.signal.count({
    where: { createdAt: { gte: start, lte: end } },
  });

  // Trades opened / closed this week
  const tradesOpened = await db.portfolioPosition.count({
    where: { userId, openedAt: { gte: start, lte: end } },
  });
  const tradesClosed = await db.portfolioPosition.count({
    where: { userId, closedAt: { gte: start, lte: end } },
  });

  // P&L this week
  const { pnl: weekPnl, pnlPct: weekPnlPercent, trades } = await getWeekPnl(userId, start, end);

  // Best / worst trade
  let bestTrade: WeeklyReport['bestTrade'] = null;
  let worstTrade: WeeklyReport['worstTrade'] = null;
  if (trades.length > 0) {
    const sorted = [...trades].sort((a, b) => b.pnlPercent - a.pnlPercent);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best) bestTrade = { ticker: best.ticker, returnPercent: best.pnlPercent };
    if (worst) worstTrade = { ticker: worst.ticker, returnPercent: worst.pnlPercent };
  }

  // Guru of the week — highest accuracy among signals this week
  const guruStats = await db.signal.groupBy({
    by: ['guruId'],
    where: { createdAt: { gte: start, lte: end }, outcome1w: 'WIN' },
    _count: { id: true },
  });

  const totalByGuru = await db.signal.groupBy({
    by: ['guruId'],
    where: { createdAt: { gte: start, lte: end }, outcome1w: { not: null } },
    _count: { id: true },
  });

  let guruOfTheWeek: WeeklyReport['guruOfTheWeek'] = null;
  let bestAccuracy = 0;
  for (const g of guruStats) {
    const total = totalByGuru.find((t) => t.guruId === g.guruId)?._count.id ?? 0;
    const accuracy = total > 0 ? g._count.id / total : 0;
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      const guru = await db.guru.findUnique({ where: { id: g.guruId } });
      if (guru) {
        guruOfTheWeek = {
          name: guru.displayName,
          handle: guru.twitterHandle,
          accuracy: Math.round(accuracy * 100),
        };
      }
    }
  }

  // Top sectors — derived from ticker → sector mapping
  // Since Signal has no sector field, just return top tickers as a proxy
  const tickerAgg = await db.signal.groupBy({
    by: ['tickers'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const topSectors = tickerAgg.map((s) => ({
    sector: s.tickers,
    signalCount: s._count.id,
  }));

  // Win streak — count consecutive positive-PnL weeks going backwards
  let current = 0;
  let best = 0;
  for (let i = 0; i < 52; i++) {
    const wb = getWeekBounds(i);
    const { pnl } = await getWeekPnl(userId, wb.start, wb.end);
    if (pnl > 0) {
      current = i === current ? current + 1 : current;
      best = Math.max(best, current);
    } else if (i === current) {
      break;
    }
  }

  // Week over week change
  const { pnl: prevPnl } = await getWeekPnl(userId, prev.start, prev.end);
  const weekOverWeekChange = prevPnl !== 0
    ? Math.round(((weekPnl - prevPnl) / Math.abs(prevPnl)) * 100)
    : 0;

  return {
    weekStartDate: start.toISOString(),
    weekEndDate: end.toISOString(),
    signalsReceived,
    tradesOpened,
    tradesClosed,
    weekPnl: Math.round(weekPnl * 100) / 100,
    weekPnlPercent: Math.round(weekPnlPercent * 100) / 100,
    bestTrade,
    worstTrade,
    guruOfTheWeek,
    topSectors,
    streakStatus: { current, best },
    weekOverWeekChange,
  };
}
