import { getDb } from './database.js';

export interface TradeInfo {
  ticker: string;
  returnPercent: number;
}

export interface GuruRoi {
  guruName: string;
  guruHandle: string;
  trades: number;
  winRate: number;
  avgReturn: number;
}

export interface MonthlyReturn {
  month: string;
  return: number;
}

export interface PerformanceData {
  totalTrades: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  avgReturn: number;
  bestTrade: TradeInfo | null;
  worstTrade: TradeInfo | null;
  roiByGuru: GuruRoi[];
  monthlyReturns: MonthlyReturn[];
  totalPnl: number;
  totalInvested: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getUserPerformance(userId: string): Promise<PerformanceData> {
  const db = getDb();

  const positions = await db.portfolioPosition.findMany({
    where: { userId },
    include: { signal: { include: { guru: true } } },
    orderBy: { openedAt: 'desc' },
  });

  const open = positions.filter((p) => !p.closedAt);
  const closed = positions.filter((p) => p.closedAt && p.closePrice !== null);

  let wins = 0;
  let totalReturnSum = 0;
  let bestTrade: TradeInfo | null = null;
  let worstTrade: TradeInfo | null = null;
  let totalPnl = 0;
  let totalInvested = 0;

  // guru aggregation maps
  const guruMap = new Map<string, { name: string; handle: string; wins: number; total: number; returnSum: number }>();

  // monthly aggregation
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const monthlyMap = new Map<string, number>();

  for (const p of closed) {
    const cost = p.shares * p.avgCost;
    const revenue = p.shares * p.closePrice!;
    const pnl = revenue - cost;
    const returnPct = cost > 0 ? (pnl / cost) * 100 : 0;

    totalPnl += pnl;
    totalInvested += cost;
    totalReturnSum += returnPct;

    if (pnl > 0) wins++;

    if (!bestTrade || returnPct > bestTrade.returnPercent) {
      bestTrade = { ticker: p.ticker, returnPercent: round2(returnPct) };
    }
    if (!worstTrade || returnPct < worstTrade.returnPercent) {
      worstTrade = { ticker: p.ticker, returnPercent: round2(returnPct) };
    }

    // guru ROI
    if (p.signal?.guru) {
      const g = p.signal.guru;
      const entry = guruMap.get(g.id) ?? { name: g.displayName, handle: g.twitterHandle, wins: 0, total: 0, returnSum: 0 };
      entry.total++;
      entry.returnSum += returnPct;
      if (pnl > 0) entry.wins++;
      guruMap.set(g.id, entry);
    }

    // monthly
    if (p.closedAt && p.closedAt >= sixMonthsAgo) {
      const key = monthKey(p.closedAt);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + pnl);
    }
  }

  // Build last 6 months array
  const monthlyReturns: MonthlyReturn[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    monthlyReturns.push({ month: key, return: round2(monthlyMap.get(key) ?? 0) });
  }

  const roiByGuru: GuruRoi[] = [...guruMap.values()].map((g) => ({
    guruName: g.name,
    guruHandle: g.handle,
    trades: g.total,
    winRate: g.total > 0 ? Math.round((g.wins / g.total) * 100) : 0,
    avgReturn: g.total > 0 ? round2(g.returnSum / g.total) : 0,
  }));

  return {
    totalTrades: positions.length,
    openPositions: open.length,
    closedPositions: closed.length,
    winRate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0,
    avgReturn: closed.length > 0 ? round2(totalReturnSum / closed.length) : 0,
    bestTrade,
    worstTrade,
    roiByGuru,
    monthlyReturns,
    totalPnl: round2(totalPnl),
    totalInvested: round2(totalInvested),
  };
}
