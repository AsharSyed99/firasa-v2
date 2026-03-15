import { getEnv } from '../config/env.js';

interface FinnhubQuote {
  c: number;  // current
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

interface FinnhubCompanyProfile {
  ticker: string;
  name: string;
  finnhubIndustry: string;
  marketCapitalization: number;
}

export interface FinnhubEnrichment {
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  previousClose: number;
  industry: string | null;
}

/** Get real-time quote from Finnhub */
export async function getQuote(ticker: string): Promise<FinnhubEnrichment | null> {
  const env = getEnv();

  const [quoteRes, profileRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`),
  ]);

  if (!quoteRes.ok) return null;

  const quote = (await quoteRes.json()) as FinnhubQuote;
  const profile = profileRes.ok
    ? ((await profileRes.json()) as FinnhubCompanyProfile)
    : null;

  if (!quote.c) return null;

  return {
    currentPrice: quote.c,
    dayHigh: quote.h,
    dayLow: quote.l,
    openPrice: quote.o,
    previousClose: quote.pc,
    industry: profile?.finnhubIndustry ?? null,
  };
}
