import { getEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('unusual-whales');

const BASE_URL = 'https://api.unusualwhales.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── In-memory cache ─────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Exposed for testing */
export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}

// ─── HTTP helpers ────────────────────────────────────────────

function getApiKey(): string | undefined {
  return getEnv().UNUSUAL_WHALES_API_KEY;
}

async function uwFetch<T>(path: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cacheKey = path;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      log.warn({ status: res.status, path }, 'UW API request failed');
      return null;
    }

    const data = (await res.json()) as T;
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    log.error({ err, path }, 'UW API request error');
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────

export interface UWOptionsFlow {
  data: Array<{
    sentiment: string;
    volume: number;
    open_interest: number;
    put_call_ratio: number;
    [key: string]: unknown;
  }>;
}

export interface UWDarkPool {
  data: Array<{
    volume: number;
    price: number;
    side: string;
    [key: string]: unknown;
  }>;
}

export interface UWCongressTrades {
  data: Array<{
    politician: string;
    trade_type: string;
    amount: string;
    transaction_date: string;
    ticker?: string;
    [key: string]: unknown;
  }>;
}

export interface UWInsiderTrades {
  data: Array<{
    name: string;
    title: string;
    transaction_type: string;
    shares: number;
    transaction_date: string;
    [key: string]: unknown;
  }>;
}

export interface UWMarketTide {
  data: {
    sentiment: string;
    bullish_flow: number;
    bearish_flow: number;
    [key: string]: unknown;
  };
}

export interface UWTickerInfo {
  data: {
    ticker: string;
    name: string;
    sector: string;
    market_cap: number;
    [key: string]: unknown;
  };
}

export async function getOptionsFlow(ticker: string): Promise<UWOptionsFlow | null> {
  return uwFetch<UWOptionsFlow>(`/api/stock/${ticker}/options-flow`);
}

export async function getDarkPoolFlow(ticker: string): Promise<UWDarkPool | null> {
  return uwFetch<UWDarkPool>(`/api/darkpool/${ticker}`);
}

export async function getCongressionalTrades(ticker?: string): Promise<UWCongressTrades | null> {
  const path = ticker ? `/api/congress/trades/${ticker}` : '/api/congress/trades';
  return uwFetch<UWCongressTrades>(path);
}

export async function getInsiderTrades(ticker: string): Promise<UWInsiderTrades | null> {
  return uwFetch<UWInsiderTrades>(`/api/insider/trades/${ticker}`);
}

export async function getMarketTide(): Promise<UWMarketTide | null> {
  return uwFetch<UWMarketTide>('/api/market/tide');
}

export async function getTickerInfo(ticker: string): Promise<UWTickerInfo | null> {
  return uwFetch<UWTickerInfo>(`/api/stock/${ticker}/info`);
}
