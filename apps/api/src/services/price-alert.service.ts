import { getDb } from './database.js';
import { getCurrentPrice } from '../providers/yahoo-finance.js';
import { TIER_LIMITS } from '@firasa/shared';

type UserTier = keyof typeof TIER_LIMITS;

export async function getUserAlerts(userId: string) {
  const db = getDb();
  const alerts = await db.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return alerts;
}

export async function createAlert(
  userId: string,
  input: { ticker: string; condition: string; targetPrice: number },
) {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { tier: true } });
  const tier = user.tier as UserTier;
  const max = TIER_LIMITS[tier].maxPriceAlerts;

  const activeCount = await db.priceAlert.count({
    where: { userId, isActive: true },
  });

  if (activeCount >= max) {
    throw new Error(`Alert limit reached (${max} for ${tier} tier)`);
  }

  if (!['above', 'below'].includes(input.condition)) {
    throw new Error('Condition must be "above" or "below"');
  }

  const alert = await db.priceAlert.create({
    data: {
      userId,
      ticker: input.ticker.toUpperCase().trim(),
      condition: input.condition,
      targetPrice: input.targetPrice,
    },
  });
  return alert;
}

export async function deleteAlert(userId: string, alertId: string) {
  const db = getDb();
  const alert = await db.priceAlert.findUnique({ where: { id: alertId } });
  if (!alert || alert.userId !== userId) {
    throw new Error('Alert not found');
  }
  await db.priceAlert.delete({ where: { id: alertId } });
}

/** Called by scheduler — checks all active alerts against current prices */
export async function checkAlerts() {
  const db = getDb();

  const activeAlerts = await db.priceAlert.findMany({
    where: { isActive: true },
    include: { user: { include: { devices: true } } },
  });

  if (activeAlerts.length === 0) return { checked: 0, triggered: 0 };

  // Collect unique tickers
  const tickers = [...new Set(activeAlerts.map((a) => a.ticker))];

  // Fetch prices in parallel
  const priceMap = new Map<string, number>();
  await Promise.allSettled(
    tickers.map(async (ticker) => {
      const data = await getCurrentPrice(ticker);
      if (data) priceMap.set(ticker, data.price);
    }),
  );

  let triggered = 0;

  for (const alert of activeAlerts) {
    const price = priceMap.get(alert.ticker);
    if (price == null) continue;

    const shouldTrigger =
      (alert.condition === 'above' && price >= alert.targetPrice) ||
      (alert.condition === 'below' && price <= alert.targetPrice);

    if (shouldTrigger) {
      await db.priceAlert.update({
        where: { id: alert.id },
        data: { isActive: false, triggeredAt: new Date() },
      });
      triggered++;
      console.log(
        `🔔 Price alert triggered: ${alert.ticker} ${alert.condition} $${alert.targetPrice} (current: $${price})`,
      );
    }
  }

  return { checked: activeAlerts.length, triggered };
}
