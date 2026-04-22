/**
 * Cron endpoint: checks signal outcomes by fetching current prices from Finnhub.
 * Classifies outcome as WIN (>2%), LOSS (<-2%), or FLAT.
 *
 * Trigger: Vercel Cron or external service every 15-60 min.
 * Auth: CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function escSql(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function genId(prefix: string) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function classifyOutcome(pctChange: number): string {
  if (pctChange > 2) return 'WIN';
  if (pctChange < -2) return 'LOSS';
  return 'FLAT';
}

function parseTickers(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return [v]; }
  }
  return [];
}

async function fetchFinnhubQuote(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number };
    // c = current price; Finnhub returns 0 for unknown symbols
    if (!data.c || data.c === 0) return null;
    return data.c;
  } catch {
    return null;
  }
}

interface TimeframeConfig {
  column: string;
  priceColumn: string;
  hourOffset: number;
}

const TIMEFRAMES: TimeframeConfig[] = [
  { column: 'outcome_1h', priceColumn: 'price_1h_later', hourOffset: 1 },
  { column: 'outcome_4h', priceColumn: 'price_4h_later', hourOffset: 4 },
  { column: 'outcome_1d', priceColumn: 'price_1d_later', hourOffset: 24 },
  { column: 'outcome_3d', priceColumn: 'price_3d_later', hourOffset: 72 },
];

export async function GET(req: NextRequest) {
  // Auth
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const summary = { checked: 0, updated: 0, errors: 0, byTimeframe: {} as Record<string, number> };

  for (const tf of TIMEFRAMES) {
    try {
      // Fetch signals that are old enough for this timeframe but haven't been checked yet
      const result = await db.execute(
        `SELECT id, tickers, entry_price, created_at
         FROM signals
         WHERE ${tf.column} IS NULL
           AND entry_price IS NOT NULL
           AND created_at >= datetime('now', '-7 days')
           AND created_at <= datetime('now', '-${tf.hourOffset} hours')
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const signals = result.rows as any[];
      let tfUpdated = 0;

      // Batch by first ticker to avoid redundant API calls
      const tickerPriceCache = new Map<string, number | null>();

      for (const signal of signals) {
        summary.checked++;
        try {
          const tickers = parseTickers(signal.tickers);
          const ticker = tickers[0];
          if (!ticker) continue;

          // Check cache first
          if (!tickerPriceCache.has(ticker)) {
            const price = await fetchFinnhubQuote(ticker);
            tickerPriceCache.set(ticker, price);
          }

          const currentPrice = tickerPriceCache.get(ticker);
          if (currentPrice === null || currentPrice === undefined) continue;

          const entryPrice = Number(signal.entry_price);
          if (!entryPrice || entryPrice === 0) continue;

          const pctChange = ((currentPrice - entryPrice) / entryPrice) * 100;
          const outcome = classifyOutcome(pctChange);

          // Update signal
          await db.execute(
            `UPDATE signals SET ${tf.column} = ${escSql(outcome)}, ${tf.priceColumn} = ${escSql(currentPrice)}, updated_at = datetime('now') WHERE id = ${escSql(signal.id)}`
          );

          // Store in signal_outcomes
          await db.execute(
            `INSERT INTO signal_outcomes (id, signal_id, timeframe, price_at_signal, price_at_check, pct_change, outcome)
             VALUES (${escSql(genId('so'))}, ${escSql(signal.id)}, ${escSql(tf.column)}, ${escSql(entryPrice)}, ${escSql(currentPrice)}, ${escSql(Math.round(pctChange * 100) / 100)}, ${escSql(outcome)})`
          );

          tfUpdated++;
          summary.updated++;
        } catch (err: any) {
          summary.errors++;
        }
      }

      summary.byTimeframe[tf.column] = tfUpdated;
    } catch (err: any) {
      summary.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    ...summary,
  });
}
