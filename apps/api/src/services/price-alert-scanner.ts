import { getDb } from './database.js';
import { getQuotes } from '../providers/yahoo-finance.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('price-alerts');

/** Scan unfired price alerts and trigger those whose conditions are met */
export async function scanPriceAlerts(): Promise<number> {
  const db = getDb();

  const alerts = await db.priceAlert.findMany({
    where: { triggeredAt: null, isActive: true },
  });

  if (alerts.length === 0) return 0;

  // Group by ticker to minimize API calls
  const tickers = [...new Set(alerts.map((a) => a.ticker))];
  const quotes = await getQuotes(tickers);

  let triggered = 0;

  for (const alert of alerts) {
    const quote = quotes.get(alert.ticker);
    if (!quote) continue;

    const shouldTrigger =
      (alert.condition === 'above' && quote.price >= alert.targetPrice) ||
      (alert.condition === 'below' && quote.price <= alert.targetPrice);

    if (shouldTrigger) {
      await db.priceAlert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date(), isActive: false },
      });

      await db.notification.create({
        data: {
          userId: alert.userId,
          type: 'price_alert',
          title: `$${alert.ticker} hit $${quote.price.toFixed(2)}`,
          body: `Your ${alert.condition} alert at $${alert.targetPrice} was triggered.`,
        },
      });

      triggered++;
    }
  }

  if (triggered > 0) {
    log.info({ triggered, scanned: alerts.length }, 'Price alerts triggered');
  }

  return triggered;
}
