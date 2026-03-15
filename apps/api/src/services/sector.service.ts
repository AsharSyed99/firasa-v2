import { getDb } from './database.js';

export interface SectorBreakdown {
  sector: string;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
  avgScore: number;
  topTickers: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export const SECTOR_MAP: Record<string, string> = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', GOOG: 'Technology',
  META: 'Technology', NVDA: 'Technology', AMD: 'Technology', INTC: 'Technology',
  CRM: 'Technology', ORCL: 'Technology', ADBE: 'Technology', CSCO: 'Technology',
  IBM: 'Technology', AVGO: 'Technology', QCOM: 'Technology', TXN: 'Technology',
  NOW: 'Technology', SNOW: 'Technology', PLTR: 'Technology', NET: 'Technology',
  SHOP: 'Technology', SQ: 'Technology', UBER: 'Technology', SNAP: 'Technology',
  // Healthcare
  JNJ: 'Healthcare', UNH: 'Healthcare', PFE: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', LLY: 'Healthcare', TMO: 'Healthcare', ABT: 'Healthcare',
  BMY: 'Healthcare', AMGN: 'Healthcare', GILD: 'Healthcare', ISRG: 'Healthcare',
  MRNA: 'Healthcare', BNTX: 'Healthcare',
  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', SLB: 'Energy',
  EOG: 'Energy', OXY: 'Energy', MPC: 'Energy', PSX: 'Energy',
  VLO: 'Energy', HAL: 'Energy',
  // Finance
  JPM: 'Finance', BAC: 'Finance', WFC: 'Finance', GS: 'Finance',
  MS: 'Finance', C: 'Finance', BLK: 'Finance', SCHW: 'Finance',
  AXP: 'Finance', V: 'Finance', MA: 'Finance', PYPL: 'Finance',
  COF: 'Finance', USB: 'Finance',
  // Consumer
  AMZN: 'Consumer', WMT: 'Consumer', COST: 'Consumer', HD: 'Consumer',
  TGT: 'Consumer', NKE: 'Consumer', SBUX: 'Consumer', MCD: 'Consumer',
  KO: 'Consumer', PEP: 'Consumer', PG: 'Consumer', CL: 'Consumer',
  // Automotive
  TSLA: 'Automotive', F: 'Automotive', GM: 'Automotive', RIVN: 'Automotive',
  LCID: 'Automotive', TM: 'Automotive',
  // Telecom
  T: 'Telecom', VZ: 'Telecom', TMUS: 'Telecom',
  // Industrials
  BA: 'Industrials', CAT: 'Industrials', GE: 'Industrials', HON: 'Industrials',
  UPS: 'Industrials', LMT: 'Industrials', RTX: 'Industrials', DE: 'Industrials',
  // Entertainment
  DIS: 'Entertainment', NFLX: 'Entertainment', SPOT: 'Entertainment',
  ROKU: 'Entertainment', WBD: 'Entertainment',
  // Real Estate
  AMT: 'Real Estate', PLD: 'Real Estate', SPG: 'Real Estate', O: 'Real Estate',
};

export async function getSectorBreakdown(hours = 24): Promise<SectorBreakdown[]> {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const signals = await db.signal.findMany({
    where: { createdAt: { gte: since } },
    select: { tickers: true, sentiment: true, score: true },
    orderBy: { createdAt: 'desc' },
  });

  const sectorMap = new Map<string, {
    scoreSum: number; count: number; bullish: number; bearish: number;
    tickers: Map<string, number>;
  }>();

  for (const signal of signals) {
    const tickers = JSON.parse(signal.tickers) as string[];
    for (const raw of tickers) {
      const ticker = raw.toUpperCase();
      const sector = SECTOR_MAP[ticker] ?? 'Other';
      let entry = sectorMap.get(sector);
      if (!entry) {
        entry = { scoreSum: 0, count: 0, bullish: 0, bearish: 0, tickers: new Map() };
        sectorMap.set(sector, entry);
      }
      entry.scoreSum += signal.score;
      entry.count += 1;
      if (signal.sentiment === 'BULLISH') entry.bullish += 1;
      if (signal.sentiment === 'BEARISH') entry.bearish += 1;
      entry.tickers.set(ticker, (entry.tickers.get(ticker) ?? 0) + 1);
    }
  }

  const results: SectorBreakdown[] = [];
  for (const [sector, data] of sectorMap) {
    const topTickers = [...data.tickers.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const sentiment: SectorBreakdown['sentiment'] =
      data.bullish > data.bearish * 1.2 ? 'bullish' :
      data.bearish > data.bullish * 1.2 ? 'bearish' : 'neutral';

    results.push({
      sector,
      signalCount: data.count,
      bullishCount: data.bullish,
      bearishCount: data.bearish,
      avgScore: Math.round(data.scoreSum / data.count),
      topTickers,
      sentiment,
    });
  }

  results.sort((a, b) => b.signalCount - a.signalCount);
  return results;
}
