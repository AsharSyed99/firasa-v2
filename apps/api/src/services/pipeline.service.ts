import { getDb } from './database.js';
import { getPrioritizedGurus, consumePollCredit } from './guru-pool.service.js';
import { fetchUserTweets, lookupUserId, isRetweet, isQuoteTweet } from '../providers/twitter.js';
import { getQuotes, getPriceAtTime } from '../providers/yahoo-finance.js';
import { getQuote as getFinnhubQuote } from '../providers/finnhub.js';
import { chatCompletion, analyzeImage } from '../providers/groq.js';

/** Common stock ticker pattern */
const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

/** Known non-ticker symbols to skip */
const TICKER_BLACKLIST = new Set(['I', 'A', 'AM', 'PM', 'US', 'CEO', 'IPO', 'ETF', 'AI']);

/** Cooldown: same guru + same primary ticker within this window → update instead of create */
const SAME_TICKER_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

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
      // 1. Skip if already processed (exact tweet dedup)
      const existing = await db.signal.findUnique({ where: { tweetId: tweet.id } });
      if (existing) continue;

      // 2. Skip pure retweets — not the guru's own opinion
      if (isRetweet(tweet)) {
        console.log(`[PIPELINE] Skipping retweet from @${guru.twitterHandle}: ${tweet.id}`);
        continue;
      }

      // 3. Extract tickers
      const tickers = extractTickers(tweet.text);
      if (tickers.length === 0) continue;

      // 4. Check for repeated ticker mention (same guru + same primary ticker recently)
      const recentSame = await findRecentSignalForTicker(guruId, tickers[0]);
      if (recentSame) {
        // Update existing signal — boost confidence, append tweet reference
        await db.signal.update({
          where: { id: recentSame.id },
          data: {
            confidence: Math.min(1, recentSame.confidence + 0.1),
            score: Math.min(100, recentSame.score + 5),
            reasoning: `${recentSame.reasoning ?? ''}\n[+1 mention: ${tweet.text.slice(0, 80)}...]`,
          },
        });
        console.log(`[PIPELINE] Merged repeated $${tickers[0]} mention into signal ${recentSame.id}`);
        result.signalsCreated++; // Count as processed
        continue;
      }

      // 5. Enrich with market data
      const quotes = await getQuotes(tickers);
      const finnhubData = await getFinnhubQuote(tickers[0]);

      // 6. Analyze images if present
      let imageAnalysis: string | null = null;
      const mediaKeys = tweet.attachments?.media_keys ?? [];
      if (mediaKeys.length > 0) {
        const imageUrl = mediaMap.get(mediaKeys[0]);
        if (imageUrl) {
          const imgResult = await analyzeImage(imageUrl, buildImagePrompt(tweet.text));
          imageAnalysis = imgResult.content;
        }
      }

      // 7. LLM analysis
      const enrichmentContext = buildEnrichmentContext(tickers, quotes, finnhubData);
      const isQuote = isQuoteTweet(tweet);
      const analysis = await analyzeTweet(tweet.text, enrichmentContext, imageAnalysis, isQuote);

      // 8. Get entry price at tweet time
      const tweetTime = new Date(tweet.created_at);
      const priceAtTweet = await getPriceAtTime(tickers[0], tweetTime);

      // 9. Persist signal
      await db.signal.create({
        data: {
          guruId,
          tweetId: tweet.id,
          tweetText: tweet.text,
          tweetCreatedAt: tweetTime,
          tickers: JSON.stringify(tickers),
          action: analysis.action,
          sentiment: analysis.sentiment,
          confidence: isQuote ? analysis.confidence * 0.8 : analysis.confidence, // Slightly lower confidence for quote tweets
          score: analysis.score,
          reasoning: isQuote
            ? `[Quote Tweet] ${analysis.reasoning}`
            : analysis.reasoning,
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

/** Run pipeline for active gurus, respecting global poll budget and priority */
export async function runPipelineAll(): Promise<PipelineResult[]> {
  const prioritizedIds = await getPrioritizedGurus();

  const results: PipelineResult[] = [];
  for (const guruId of prioritizedIds) {
    if (!consumePollCredit()) {
      console.warn('Poll budget exhausted — stopping pipeline run');
      break;
    }
    const result = await runPipelineForGuru(guruId);
    results.push(result);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Find a recent signal from the same guru for the same primary ticker.
 * If found within the cooldown window, we merge instead of creating a new signal.
 */
async function findRecentSignalForTicker(guruId: string, ticker: string) {
  const db = getDb();
  const cutoff = new Date(Date.now() - SAME_TICKER_COOLDOWN_MS);

  const recent = await db.signal.findFirst({
    where: {
      guruId,
      createdAt: { gte: cutoff },
      tickers: { contains: `"${ticker}"` },
    },
    orderBy: { createdAt: 'desc' },
  });

  return recent;
}

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
  imageAnalysis: string | null,
  isQuote = false
): Promise<AnalysisResult> {
  const quoteNote = isQuote
    ? '\nNote: This is a QUOTE TWEET — the guru is commenting on someone else\'s post. Focus on the guru\'s added commentary for the signal, not the original tweet content.'
    : '';

  const systemPrompt = `You are a financial signal analyst. Analyze the following tweet from a financial guru and determine:
1. ACTION: BUY, SELL, HOLD, or UNCLEAR
2. SENTIMENT: BULLISH, BEARISH, NEUTRAL, or MIXED
3. CONFIDENCE: 0-1 (how confident the guru seems)
4. SCORE: 0-100 (overall signal strength, considering conviction + data quality)
5. REASONING: Brief explanation${quoteNote}

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
