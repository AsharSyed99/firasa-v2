import * as uw from '../providers/unusual-whales.js';
import { getDb } from './database.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('smart-money');

// ─── Types ───────────────────────────────────────────────────

export interface SmartMoneyConfirmation {
  ticker: string;
  guruSignal: { action: string; confidence: number; score: number };
  optionsFlow: {
    bullishVolume: number;
    bearishVolume: number;
    netSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    unusualActivity: boolean;
  } | null;
  darkPool: {
    totalVolume: number;
    largeBlockCount: number;
    netDirection: 'BUY' | 'SELL' | 'MIXED';
  } | null;
  congressTrades: {
    recentTrades: Array<{ politician: string; action: string; amount: string; date: string }>;
  } | null;
  insiderTrades: {
    recentTrades: Array<{ name: string; title: string; action: string; shares: number; date: string }>;
  } | null;
  confirmationScore: number;
  summary: string;
}

export interface MarketOverview {
  sentiment: string;
  bullishFlow: number;
  bearishFlow: number;
  raw: Record<string, unknown> | null;
}

// ─── Score helpers (exported for testing) ────────────────────

export function calcConfirmationScore(
  guruAction: string,
  optionsFlow: SmartMoneyConfirmation['optionsFlow'],
  darkPool: SmartMoneyConfirmation['darkPool'],
  congressTrades: SmartMoneyConfirmation['congressTrades'],
  insiderTrades: SmartMoneyConfirmation['insiderTrades'],
): number {
  let score = 0;
  const isBullish = guruAction === 'BUY';
  const isBearish = guruAction === 'SELL';

  if (optionsFlow) {
    const flowBullish = optionsFlow.netSentiment === 'BULLISH';
    const flowBearish = optionsFlow.netSentiment === 'BEARISH';
    if ((isBullish && flowBullish) || (isBearish && flowBearish)) score += 30;
    if (optionsFlow.unusualActivity) score += 15;
  }

  if (darkPool) {
    const dpBuy = darkPool.netDirection === 'BUY';
    const dpSell = darkPool.netDirection === 'SELL';
    if ((isBullish && dpBuy) || (isBearish && dpSell)) score += 25;
  }

  if (congressTrades && congressTrades.recentTrades.length > 0) {
    const hasBuy = congressTrades.recentTrades.some((t) => /purchase/i.test(t.action));
    const hasSell = congressTrades.recentTrades.some((t) => /sale/i.test(t.action));
    if ((isBullish && hasBuy) || (isBearish && hasSell)) score += 20;
  }

  if (insiderTrades && insiderTrades.recentTrades.length > 0) {
    const hasBuy = insiderTrades.recentTrades.some((t) => /purchase|buy/i.test(t.action));
    const hasSell = insiderTrades.recentTrades.some((t) => /sale|sell/i.test(t.action));
    if ((isBullish && hasBuy) || (isBearish && hasSell)) score += 10;
  }

  return Math.min(100, score);
}

export function buildSummary(
  ticker: string,
  guruAction: string,
  confirmationScore: number,
  optionsFlow: SmartMoneyConfirmation['optionsFlow'],
  darkPool: SmartMoneyConfirmation['darkPool'],
): string {
  const parts: string[] = [];

  if (confirmationScore >= 70) {
    parts.push(`Strong institutional confirmation for ${guruAction} on $${ticker}.`);
  } else if (confirmationScore >= 40) {
    parts.push(`Moderate institutional support for ${guruAction} on $${ticker}.`);
  } else {
    parts.push(`Limited institutional data confirming ${guruAction} on $${ticker}.`);
  }

  if (optionsFlow) {
    parts.push(`Options flow is ${optionsFlow.netSentiment.toLowerCase()}${optionsFlow.unusualActivity ? ' with unusual activity' : ''}.`);
  }

  if (darkPool) {
    parts.push(`Dark pool direction: ${darkPool.netDirection}.`);
  }

  return parts.join(' ');
}

// ─── Data mappers ────────────────────────────────────────────

function mapOptionsFlow(raw: uw.UWOptionsFlow | null): SmartMoneyConfirmation['optionsFlow'] {
  if (!raw?.data?.length) return null;
  let bullVol = 0, bearVol = 0, unusual = false;
  for (const entry of raw.data) {
    if (/bullish|call/i.test(entry.sentiment ?? '')) bullVol += entry.volume ?? 0;
    else bearVol += entry.volume ?? 0;
    if ((entry.volume ?? 0) > (entry.open_interest ?? 0) * 2) unusual = true;
  }
  const net: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    bullVol > bearVol * 1.3 ? 'BULLISH' : bearVol > bullVol * 1.3 ? 'BEARISH' : 'NEUTRAL';
  return { bullishVolume: bullVol, bearishVolume: bearVol, netSentiment: net, unusualActivity: unusual };
}

function mapDarkPool(raw: uw.UWDarkPool | null): SmartMoneyConfirmation['darkPool'] {
  if (!raw?.data?.length) return null;
  let totalVol = 0, buys = 0, sells = 0, largeBlocks = 0;
  for (const entry of raw.data) {
    totalVol += entry.volume ?? 0;
    if (entry.volume > 100_000) largeBlocks++;
    if (/buy/i.test(entry.side ?? '')) buys += entry.volume;
    else sells += entry.volume;
  }
  const dir: 'BUY' | 'SELL' | 'MIXED' = buys > sells * 1.2 ? 'BUY' : sells > buys * 1.2 ? 'SELL' : 'MIXED';
  return { totalVolume: totalVol, largeBlockCount: largeBlocks, netDirection: dir };
}

function mapCongress(raw: uw.UWCongressTrades | null): SmartMoneyConfirmation['congressTrades'] {
  if (!raw?.data?.length) return null;
  return {
    recentTrades: raw.data.slice(0, 10).map((t) => ({
      politician: t.politician, action: t.trade_type, amount: t.amount, date: t.transaction_date,
    })),
  };
}

function mapInsider(raw: uw.UWInsiderTrades | null): SmartMoneyConfirmation['insiderTrades'] {
  if (!raw?.data?.length) return null;
  return {
    recentTrades: raw.data.slice(0, 10).map((t) => ({
      name: t.name, title: t.title, action: t.transaction_type, shares: t.shares, date: t.transaction_date,
    })),
  };
}

// ─── Public API ──────────────────────────────────────────────

export async function getSmartMoneyConfirmation(
  ticker: string,
  guruAction: string,
  guruConfidence: number,
  guruScore: number,
): Promise<SmartMoneyConfirmation> {
  log.info({ ticker, guruAction }, 'Fetching smart money confirmation');

  const [rawOptions, rawDark, rawCongress, rawInsider] = await Promise.all([
    uw.getOptionsFlow(ticker),
    uw.getDarkPoolFlow(ticker),
    uw.getCongressionalTrades(ticker),
    uw.getInsiderTrades(ticker),
  ]);

  const optionsFlow = mapOptionsFlow(rawOptions);
  const darkPool = mapDarkPool(rawDark);
  const congressTrades = mapCongress(rawCongress);
  const insiderTrades = mapInsider(rawInsider);

  const confirmationScore = calcConfirmationScore(guruAction, optionsFlow, darkPool, congressTrades, insiderTrades);
  const summary = buildSummary(ticker, guruAction, confirmationScore, optionsFlow, darkPool);

  return {
    ticker,
    guruSignal: { action: guruAction, confidence: guruConfidence, score: guruScore },
    optionsFlow,
    darkPool,
    congressTrades,
    insiderTrades,
    confirmationScore,
    summary,
  };
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const tide = await uw.getMarketTide();
  return {
    sentiment: tide?.data?.sentiment ?? 'UNKNOWN',
    bullishFlow: tide?.data?.bullish_flow ?? 0,
    bearishFlow: tide?.data?.bearish_flow ?? 0,
    raw: tide?.data ? { ...tide.data } : null,
  };
}

/** Fire-and-forget: enrich a signal with smart money data and persist */
export async function enrichWithSmartMoney(
  signalId: string, ticker: string, action: string, confidence: number, score: number,
): Promise<void> {
  const confirmation = await getSmartMoneyConfirmation(ticker, action, confidence, score);
  const db = getDb();
  await db.signal.update({
    where: { id: signalId },
    data: {
      smartMoneyScore: confirmation.confirmationScore,
      smartMoneySummary: confirmation.summary,
    },
  });
  log.info({ signalId, confirmationScore: confirmation.confirmationScore }, 'Signal enriched with smart money data');
}
