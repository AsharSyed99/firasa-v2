import { getDb } from './database.js';
import { getCurrentPrice } from '../providers/yahoo-finance.js';

export interface PortfolioPosition {
  id: string;
  userId: string;
  ticker: string;
  shares: number;
  avgCost: number;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  totalCost: number;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  realizedPnl: number | null;
  linkedSignalId: string | null;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  positions: PortfolioPosition[];
}

export async function getPortfolio(userId: string): Promise<PortfolioSummary> {
  const db = getDb();

  const positions = await db.portfolioPosition.findMany({
    where: { userId },
    orderBy: { openedAt: 'desc' },
  });

  // Fetch current prices for open positions
  const openTickers = [...new Set(positions.filter((p) => !p.closedAt).map((p) => p.ticker))];
  const priceMap = new Map<string, number>();

  for (const ticker of openTickers) {
    try {
      const result = await getCurrentPrice(ticker);
      if (result?.price) priceMap.set(ticker, result.price);
    } catch {
      // Skip failed price lookups
    }
  }

  let totalValue = 0;
  let totalCost = 0;
  let wins = 0;
  let closedCount = 0;

  const enriched: PortfolioPosition[] = positions.map((p) => {
    const cost = p.shares * p.avgCost;
    const currentPrice = p.closedAt ? p.closePrice : (priceMap.get(p.ticker) ?? null);
    const marketValue = currentPrice ? p.shares * currentPrice : null;
    const unrealizedPnl = marketValue !== null ? marketValue - cost : null;
    const unrealizedPnlPercent = unrealizedPnl !== null && cost > 0 ? (unrealizedPnl / cost) * 100 : null;

    let realizedPnl: number | null = null;
    if (p.closedAt && p.closePrice) {
      realizedPnl = (p.closePrice - p.avgCost) * p.shares;
      closedCount++;
      if (realizedPnl > 0) wins++;
    }

    if (!p.closedAt && marketValue !== null) {
      totalValue += marketValue;
    }
    totalCost += p.closedAt ? 0 : cost;

    return {
      id: p.id,
      userId: p.userId,
      ticker: p.ticker,
      shares: p.shares,
      avgCost: p.avgCost,
      openedAt: p.openedAt.toISOString(),
      closedAt: p.closedAt?.toISOString() ?? null,
      closePrice: p.closePrice,
      currentPrice,
      marketValue,
      totalCost: cost,
      unrealizedPnl,
      unrealizedPnlPercent: unrealizedPnlPercent !== null ? Math.round(unrealizedPnlPercent * 100) / 100 : null,
      realizedPnl,
      linkedSignalId: p.linkedSignalId,
    };
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
    openPositions: positions.filter((p) => !p.closedAt).length,
    closedPositions: closedCount,
    winRate: closedCount > 0 ? Math.round((wins / closedCount) * 100) : 0,
    positions: enriched,
  };
}

export async function addPosition(
  userId: string,
  data: { ticker: string; shares: number; avgCost: number; linkedSignalId?: string }
): Promise<void> {
  const db = getDb();
  await db.portfolioPosition.create({
    data: {
      userId,
      ticker: data.ticker.toUpperCase(),
      shares: data.shares,
      avgCost: data.avgCost,
      linkedSignalId: data.linkedSignalId ?? null,
    },
  });
}

export async function closePosition(userId: string, positionId: string, closePrice: number): Promise<void> {
  const db = getDb();
  await db.portfolioPosition.update({
    where: { id: positionId, userId },
    data: { closedAt: new Date(), closePrice },
  });
}

export async function deletePosition(userId: string, positionId: string): Promise<void> {
  const db = getDb();
  await db.portfolioPosition.delete({ where: { id: positionId, userId } });
}
