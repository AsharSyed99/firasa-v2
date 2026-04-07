import { getDb } from './database.js';
import { getPrioritizedGurus, consumePollCredit } from './guru-pool.service.js';
import { fetchUserTweets, lookupUserId, isRetweet, isQuoteTweet } from '../providers/twitter.js';
import { getQuotes, getPriceAtTime } from '../providers/yahoo-finance.js';
import { getQuote as getFinnhubQuote } from '../providers/finnhub.js';
import { chatCompletion, analyzeImage } from '../providers/groq.js';
import { getEnv } from '../config/env.js';
import { enrichWithSmartMoney } from './smart-money.service.js';
import { fanOutAlert } from './alert.service.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('pipeline');

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
        log.info({ guruHandle: guru.twitterHandle, tweetId: tweet.id }, 'Skipping retweet');
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
        log.info({ ticker: tickers[0], signalId: recentSame.id }, 'Merged repeated mention');
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
      const analysis = await analyzeTweet(tweet.text, enrichmentContext, imageAnalysis, isQuote, guru.twitterHandle);

      // 8. Get entry price at tweet time
      const tweetTime = new Date(tweet.created_at);
      const priceAtTweet = await getPriceAtTime(tickers[0], tweetTime);

      // 9. Persist signal
      const signal = await db.signal.create({
        data: {
          guruId,
          tweetId: tweet.id,
          tweetText: tweet.text,
          tweetCreatedAt: tweetTime,
          tickers: JSON.stringify(tickers),
          action: analysis.action,
          sentiment: analysis.sentiment,
          confidence: isQuote ? analysis.confidence * 0.8 : analysis.confidence,
          score: analysis.score,
          timeframe: analysis.timeframe,
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

      // 10. Fan out alerts (WhatsApp, push) to subscribed users
      fanOutAlert({
        id: signal.id,
        guruId,
        tickers: JSON.stringify(tickers),
        action: analysis.action,
        score: analysis.score,
        reasoning: analysis.reasoning,
        tweetText: tweet.text,
        entryPrice: priceAtTweet?.price ?? null,
      }).then((stats) => {
        log.info({ signalId: signal.id, ...stats }, 'Alert fan-out complete');
      }).catch((e) => log.warn({ err: e, signalId: signal.id }, 'Alert fan-out failed'));

      // 11. Smart money enrichment (fire-and-forget)
      if (getEnv().UNUSUAL_WHALES_API_KEY) {
        enrichWithSmartMoney(signal.id, tickers[0], analysis.action, analysis.confidence, analysis.score)
          .catch((e) => log.warn({ err: e, signalId: signal.id }, 'Smart money enrichment failed'));
      }

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
      log.warn('Poll budget exhausted — stopping pipeline run');
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
  return [
    `This image was posted alongside a financial tweet: "${tweetText}".`,
    `Describe ONLY what you can clearly see. Do NOT guess or fabricate numbers.`,
    `Focus on: chart patterns, labeled price targets, support/resistance lines, technical indicators (RSI, MACD, moving averages), or any visible financial data.`,
    `If the image is blurry, a meme, or not a chart, say "Non-chart image" and describe it in one sentence.`,
    `Be concise — max 3 sentences.`,
  ].join(' ');
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
  timeframe: string;
  reasoning: string;
}

async function analyzeTweet(
  tweetText: string,
  enrichmentContext: string,
  imageAnalysis: string | null,
  isQuote = false,
  guruHandle = ''
): Promise<AnalysisResult> {
  const quoteInstruction = isQuote
    ? `\n\nIMPORTANT: This is a QUOTE TWEET. The text contains both the guru's commentary AND the original quoted post. Only analyze the guru's OWN words for the signal. The quoted content is context, not the guru's opinion.`
    : '';

  const systemPrompt = `You are a financial signal extraction engine. Extract the trading signal from a tweet by @${guruHandle || 'a financial guru'}.

OUTPUT (strict JSON, nothing else):
{"action":"...", "sentiment":"...", "confidence":0.0, "score":0, "timeframe":"...", "reasoning":"..."}

FIELD DEFINITIONS:
- ACTION: The guru's intent. One of:
  BUY = explicitly recommending purchase, "loading up", "added to position", strong entry call
  SELL = explicitly recommending exit, "trimming", "taking profits", "get out"
  HOLD = watching, monitoring, waiting for confirmation, "still in"
  UNCLEAR = commentary, news sharing, educational, vague, no actionable signal

- SENTIMENT: The guru's market outlook. One of: BULLISH, BEARISH, NEUTRAL, MIXED

- CONFIDENCE: How convicted the guru sounds (NOT your confidence in the analysis). Scale:
  0.1-0.3 = speculative, hedged language ("might", "could", "watching")
  0.4-0.6 = moderate conviction ("looking good", "I like this setup")
  0.7-0.8 = strong conviction ("loading up", "this is the play", specific price targets)
  0.9-1.0 = extreme conviction ("all in", "max position", urgent tone)

- SCORE: Overall signal quality 0-100, combining conviction + data specificity:
  0-20 = no actionable content (memes, jokes, vague commentary)
  21-40 = weak signal (general sentiment without specifics)
  41-60 = moderate signal (clear direction + some reasoning)
  61-80 = strong signal (specific targets, catalysts, or technicals)
  81-100 = exceptional (multiple confirming factors, precise levels, strong track record context)

- TIMEFRAME: One of: INTRADAY, SWING (1-5 days), POSITION (weeks-months), LONG_TERM (months+), UNKNOWN

- REASONING: One sentence explaining why you chose this action/score.

EDGE CASES — handle these:
- Sarcasm, irony, jokes → action: UNCLEAR, score: 0-10
- "Not financial advice" disclaimers → ignore them, analyze the actual content
- Macro commentary without specific ticker thesis → action: UNCLEAR, score: 10-25
- Pump language with no substance ("TO THE MOON 🚀🚀🚀") → confidence: 0.2, score: 15-25
- Multiple tickers mentioned → focus on the PRIMARY ticker (first $TICKER), note others in reasoning
- Earnings reactions → note if this is post-earnings, factor in the data quality boost${quoteInstruction}`;

  const userContent = [
    `Tweet: "${tweetText}"`,
    enrichmentContext ? `\nCurrent Market Data:\n${enrichmentContext}` : '',
    imageAnalysis ? `\nChart/Image Analysis: ${imageAnalysis}` : '',
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
      timeframe: parsed.timeframe ?? 'UNKNOWN',
      reasoning: parsed.reasoning ?? '',
    };
  } catch {
    return {
      action: 'UNCLEAR',
      sentiment: 'NEUTRAL',
      confidence: 0,
      score: 0,
      timeframe: 'UNKNOWN',
      reasoning: `Failed to parse LLM response: ${content.slice(0, 200)}`,
    };
  }
}
