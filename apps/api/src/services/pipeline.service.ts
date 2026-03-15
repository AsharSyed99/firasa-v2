import { getDb } from './database.js';
import { fetchUserTweets, lookupUserId } from '../providers/twitter.js';
import { getQuotes, getPriceAtTime } from '../providers/yahoo-finance.js';
import { getQuote as getFinnhubQuote } from '../providers/finnhub.js';
import { chatCompletion, analyzeImage } from '../providers/groq.js';

/** Common stock ticker pattern */
const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

/** Known non-ticker symbols to skip */
const TICKER_BLACKLIST = new Set(['I', 'A', 'AM', 'PM', 'US', 'CEO', 'IPO', 'ETF', 'AI']);

export interface PipelineResult {
  guruHandle: string;
  tweetsProcessed: number;
  signalsCreated: number;
  errors: string[];
}

/**
 * Run the full pipeline for a single guru:
 * 1. Fetch new tweets
 * 2. Extract tickers from text
 * 3. Enrich with market data (Yahoo + Finnhub)
 * 4. Analyze with LLM (Groq)
 * 5. Score the signal
 * 6. Get entry price at tweet time
 * 7. Persist to database
 */
export async function runPipelineForGuru(guruId: string): Promise<PipelineResult> {
  const db = getDb();
  const guru = await db.guru.findUnique({ where: { id: guruId } });
  if (!guru) throw new Error(`Guru ${guruId} not found`);

  const result: PipelineResult = {
    guruHandle: guru.twitterHandle,
    tweetsProcessed: 0,
    signalsCreated: 0,
    errors: [],
  };

  // Resolve Twitter user ID if missing
  let twitterUserId = guru.twitterUserId;
  if (!twitterUserId) {
    twitterUserId = await lookupUserId(guru.twitterHandle);
    if (!twitterUserId) {
      result.errors.push(`Could not resolve Twitter ID for @${guru.twitterHandle}`);
      return result;
    }
    await db.guru.update({ where: { id: guruId }, data: { twitterUserId } });
  }

  // Fetch tweets since last poll
  const lastSignal = await db.signal.findFirst({
    where: { guruId },
    orderBy: { tweetCreatedAt: 'desc' },
    select: { tweetId: true },
  });

  const { tweets, mediaMap } = await fetchUserTweets(twitterUserId, lastSignal?.tweetId);
  result.tweetsProcessed = tweets.length;

  if (tweets.length === 0) return result;

  for (const tweet of tweets) {
    try {
      // Skip if already processed
      const existing = await db.signal.findUnique({ where: { tweetId: tweet.id } });
      if (existing) continue;

      // Extract tickers
      const tickers = extractTickers(tweet.text);
      if (tickers.length === 0) continue;

      // Enrich with market data
      const quotes = await getQuotes(tickers);
      const finnhubData = await getFinnhubQuote(tickers[0]);

      // Analyze images if present
      let imageAnalysis: string | null = null;
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      if (mediaKeys.length > 0) {
        const imageUrl = mediaMap.get(mediaKeys[0]);
        if (imageUrl) {
          const result = await analyzeImage(imageUrl, buildImagePrompt(tweet.text));
          imageAnalysis = result.content;
        }
      }

      // LLM analysis
      const enrichmentContext = buildEnrichmentContext(tickers, quotes, finnhubData);
      const analysis = await analyzeTweet(tweet.text, enrichmentContext, imageAnalysis);

      // Get entry price at tweet time
      const tweetTime = new Date(tweet.created_at);
      const priceAtTweet = await getPriceAtTime(tickers[0], tweetTime);

      // Persist signal
      await db.signal.create({
        data: {
          guruId,
          tweetId: tweet.id,
          tweetText: tweet.text,
          tweetCreatedAt: tweetTime,
          tickers: JSON.stringify(tickers),
          action: analysis.action,
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          score: analysis.score,
          reasoning: analysis.reasoning,
          entryPrice: priceAtTweet?.price ?? null,
          entryPriceTime: priceAtTweet?.time ?? null,
          afterHours: priceAtTweet?.afterHours ?? false,
          imageAnalysis,
          rawEnrichment: JSON.stringify({ quotes: Object.fromEntries(quotes), finnhub: finnhubData }),
        },
      });

      result.signalsCreated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Tweet ${tweet.id}: ${msg}`);
    }
  }

  // Update guru stats
  await db.guru.update({
    where: { id: guruId },
    data: { lastPolledAt: new Date() },
  });

  return result;
}

/** Run pipeline for all active gurus */
export async function runPipelineAll(): Promise<PipelineResult[]> {
  const db = getDb();
  const gurus = await db.guru.findMany({ where: { isActive: true } });

  const results: PipelineResult[] = [];
  for (const guru of gurus) {
    const result = await runPipelineForGuru(guru.id);
    results.push(result);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────

function extractTickers(text: string): string[] {
  const matches = [...text.matchAll(TICKER_REGEX)];
  const tickers = new Set<string>();
  for (const match of matches) {
    const ticker = match[1];
    if (!TICKER_BLACKLIST.has(ticker)) {
      tickers.add(ticker);
    }
  }
  return [...tickers];
}

function buildImagePrompt(tweetText: string): string {
  return `This image was posted with a financial tweet: "${tweetText}". ` +
    `Describe what you see — focus on charts, price targets, support/resistance levels, ` +
    `technical indicators, or any financial data shown. Be concise.`;
}

function buildEnrichmentContext(
  tickers: string[],
  quotes: Map<string, { price: number; change: number; changePercent: number; volume: number; marketCap: number }>,
  finnhub: { currentPrice: number; dayHigh: number; dayLow: number; previousClose: number; industry: string | null } | null
): string {
  const parts: string[] = [];
  for (const ticker of tickers) {
    const q = quotes.get(ticker);
    if (q) {
      parts.push(`${ticker}: $${q.price} (${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%), Vol: ${q.volume?.toLocaleString()}, MCap: $${(q.marketCap / 1e9).toFixed(1)}B`);
    }
  }
  if (finnhub) {
    parts.push(`Finnhub: High $${finnhub.dayHigh}, Low $${finnhub.dayLow}, PrevClose $${finnhub.previousClose}, Industry: ${finnhub.industry ?? 'N/A'}`);
  }
  return parts.join('\n');
}

interface AnalysisResult {
  action: string;
  sentiment: string;
  confidence: number;
  score: number;
  reasoning: string;
}

async function analyzeTweet(
  tweetText: string,
  enrichmentContext: string,
  imageAnalysis: string | null
): Promise<AnalysisResult> {
  const systemPrompt = `You are a financial signal analyst. Analyze the following tweet from a financial guru and determine:
1. ACTION: BUY, SELL, HOLD, or UNCLEAR
2. SENTIMENT: BULLISH, BEARISH, NEUTRAL, or MIXED
3. CONFIDENCE: 0-1 (how confident the guru seems)
4. SCORE: 0-100 (overall signal strength, considering conviction + data quality)
5. REASONING: Brief explanation

Respond in JSON format: {"action":"BUY","sentiment":"BULLISH","confidence":0.8,"score":75,"reasoning":"..."}`;

  const userContent = [
    `Tweet: "${tweetText}"`,
    enrichmentContext ? `\nMarket Data:\n${enrichmentContext}` : '',
    imageAnalysis ? `\nImage Analysis: ${imageAnalysis}` : '',
  ].join('');

  const { content } = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ]);

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: parsed.action ?? 'UNCLEAR',
      sentiment: parsed.sentiment ?? 'NEUTRAL',
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0)),
      score: Math.min(100, Math.max(0, parsed.score ?? 0)),
      reasoning: parsed.reasoning ?? '',
    };
  } catch {
    return {
      action: 'UNCLEAR',
      sentiment: 'NEUTRAL',
      confidence: 0,
      score: 0,
      reasoning: `Failed to parse LLM response: ${content.slice(0, 200)}`,
    };
  }
}
