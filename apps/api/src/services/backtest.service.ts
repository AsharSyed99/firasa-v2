import { getDb } from './database.js';

export interface BacktestParams {
  guruIds?: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSize: number; // % of capital per trade
}

interface TradeLogEntry {
  date: string;
  ticker: string;
  action: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  finalCapital: number;
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  tradeLog: TradeLogEntry[];
  equityCurve: EquityPoint[];
}

export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const db = getDb();

  const where: Record<string, unknown> = {
    action: 'BUY',
    entryPrice: { not: null },
    price1dLater: { not: null },
    createdAt: {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    },
  };

  if (params.guruIds?.length) {
    where.guruId = { in: params.guruIds };
  }

  const signals = await db.signal.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      createdAt: true,
      tickers: true,
      entryPrice: true,
      price1dLater: true,
    },
  });

  let capital = params.initialCapital;
  let peak = capital;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;
  const tradeLog: TradeLogEntry[] = [];
  const equityCurve: EquityPoint[] = [{ date: params.startDate, value: capital }];
  const returns: number[] = [];

  for (const signal of signals) {
    const entry = signal.entryPrice!;
    const exit = signal.price1dLater!;
    const positionValue = capital * (params.positionSize / 100);
    const shares = positionValue / entry;
    const pnl = shares * (exit - entry);
    const returnPct = ((exit - entry) / entry) * 100;

    capital += pnl;
    returns.push(returnPct);

    if (returnPct > 0) wins++;
    else losses++;

    if (capital > peak) peak = capital;
    const drawdown = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    const tickers = JSON.parse(signal.tickers) as string[];

    tradeLog.push({
      date: signal.createdAt.toISOString().split('T')[0],
      ticker: tickers[0] ?? 'UNKNOWN',
      action: 'BUY',
      entryPrice: entry,
      exitPrice: exit,
      returnPct: Math.round(returnPct * 100) / 100,
    });

    equityCurve.push({
      date: signal.createdAt.toISOString().split('T')[0],
      value: Math.round(capital * 100) / 100,
    });
  }

  const totalTrades = wins + losses;
  const totalReturn = capital - params.initialCapital;
  const returnPercent = (totalReturn / params.initialCapital) * 100;

  // Simplified Sharpe: avgReturn / stdDevReturn
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1
    ? returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Math.round((avgReturn / stdDev) * 100) / 100 : 0;

  return {
    totalTrades,
    wins,
    losses,
    finalCapital: Math.round(capital * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio,
    tradeLog,
    equityCurve,
  };
}
