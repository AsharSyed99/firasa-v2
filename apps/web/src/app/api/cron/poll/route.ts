/**
 * Cron endpoint: polls Twitter gurus for new tweets, analyzes them with Groq,
 * enriches with market data, and saves signals to Turso.
 *
 * Trigger: Vercel Cron or external service (cron-job.org) every 15 min.
 * Auth: CRON_SECRET header prevents unauthorized access.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import webpush from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for pipeline

// ─── Config ──────────────────────────────────────────────────

const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;
const TICKER_BLACKLIST = new Set(['I', 'A', 'AM', 'PM', 'US', 'CEO', 'IPO', 'ETF', 'AI', 'USD', 'THE', 'ALL', 'NEW', 'TOP', 'NOW']);

// Common crypto/stock name → ticker mapping for tweets without $TICKER format
const NAME_TO_TICKER: Record<string, string> = {
  'bitcoin': 'BTC', 'btc': 'BTC', '#bitcoin': 'BTC',
  'ethereum': 'ETH', 'eth': 'ETH', '#ethereum': 'ETH',
  'solana': 'SOL', 'sol': 'SOL', '#solana': 'SOL',
  'xrp': 'XRP', '#xrp': 'XRP', 'ripple': 'XRP',
  'dogecoin': 'DOGE', 'doge': 'DOGE', '#dogecoin': 'DOGE',
  'cardano': 'ADA', '#cardano': 'ADA',
  'tesla': 'TSLA', 'nvidia': 'NVDA', 'apple': 'AAPL',
  'amazon': 'AMZN', 'google': 'GOOGL', 'microsoft': 'MSFT',
  'microstrategy': 'MSTR', '#mstr': 'MSTR',
  'spy': 'SPY', 'qqq': 'QQQ',
};

// ─── Twitter API ─────────────────────────────────────────────

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: { media_keys?: string[] };
  referenced_tweets?: { type: 'retweeted' | 'quoted' | 'replied_to'; id: string }[];
}

async function lookupUserId(handle: string): Promise<string | null> {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.twitter.com/2/users/by/username/${handle}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { id: string } };
  return data.data?.id ?? null;
}

async function fetchUserTweets(userId: string, sinceId?: string | null) {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) throw new Error('X_API_BEARER_TOKEN not set');

  const params = new URLSearchParams({
    'tweet.fields': 'created_at,attachments,referenced_tweets',
    'expansions': 'attachments.media_keys',
    'media.fields': 'url,preview_image_url',
    'max_results': '10',
  });
  if (sinceId) params.set('since_id', sinceId);

  const res = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X API ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  const mediaMap = new Map<string, string>();
  if (data.includes?.media) {
    for (const m of data.includes.media) {
      const url = m.url ?? m.preview_image_url;
      if (url) mediaMap.set(m.media_key, url);
    }
  }
  return { tweets: (data.data ?? []) as Tweet[], mediaMap };
}

// ─── Groq LLM ────────────────────────────────────────────────

async function analyzeTweet(
  tweetText: string,
  enrichment: string,
  isQuote: boolean,
  guruHandle: string
): Promise<{ action: string; sentiment: string; confidence: number; score: number; timeframe: string; reasoning: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not set');

  const quoteNote = isQuote ? '\n\nIMPORTANT: This is a QUOTE TWEET. Only analyze the guru\'s OWN words.' : '';
  const systemPrompt = `You are a financial signal extraction engine. Extract the trading signal from a tweet by @${guruHandle}.
OUTPUT (strict JSON): {"action":"...", "sentiment":"...", "confidence":0.0, "score":0, "timeframe":"...", "reasoning":"..."}
ACTION: BUY|SELL|HOLD|UNCLEAR. SENTIMENT: BULLISH|BEARISH|NEUTRAL|MIXED.
CONFIDENCE: 0.1-1.0 (guru's conviction). SCORE: 0-100 (signal quality).
TIMEFRAME: INTRADAY|SWING|POSITION|LONG_TERM|UNKNOWN.
REASONING: One sentence.${quoteNote}`;

  const userContent = `Tweet: "${tweetText}"${enrichment ? `\nMarket Data:\n${enrichment}` : ''}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  const content = data.choices[0].message.content;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const p = JSON.parse(match[0]);
    return {
      action: p.action ?? 'UNCLEAR',
      sentiment: p.sentiment ?? 'NEUTRAL',
      confidence: Math.min(1, Math.max(0, p.confidence ?? 0)),
      score: Math.min(100, Math.max(0, p.score ?? 0)),
      timeframe: p.timeframe ?? 'UNKNOWN',
      reasoning: p.reasoning ?? '',
    };
  } catch {
    return { action: 'UNCLEAR', sentiment: 'NEUTRAL', confidence: 0, score: 0, timeframe: 'UNKNOWN', reasoning: `Parse failed: ${content.slice(0, 100)}` };
  }
}

// ─── Yahoo Finance ───────────────────────────────────────────

async function getQuotes(tickers: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Firasa/2.0' } });
  if (!res.ok) return new Map();
  const data = await res.json() as any;
  const map = new Map<string, any>();
  for (const q of data.quoteResponse?.result ?? []) {
    map.set(q.symbol, { price: q.regularMarketPrice, change: q.regularMarketChange, changePercent: q.regularMarketChangePercent, volume: q.regularMarketVolume, marketCap: q.marketCap });
  }
  return map;
}

async function getPriceAtTime(ticker: string, targetTime: Date) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=2d&interval=5m&includePrePost=true`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Firasa/2.0' } });
  if (!res.ok) return null;
  const data = await res.json() as any;
  const result = data.chart?.result?.[0];
  if (!result?.timestamp?.length) return null;

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const targetSec = Math.floor(targetTime.getTime() / 1000);
  let bestIdx = 0, bestDiff = Math.abs(timestamps[0] - targetSec);
  for (let i = 1; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetSec);
    if (diff < bestDiff) { bestIdx = i; bestDiff = diff; }
  }
  const price = closes[bestIdx];
  if (price == null) return null;

  const barHour = new Date(timestamps[bestIdx] * 1000).getUTCHours();
  return { price, time: new Date(timestamps[bestIdx] * 1000), afterHours: barHour < 14 || barHour >= 21 };
}

// ─── Helpers ─────────────────────────────────────────────────

function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  // Match $TICKER cashtags
  const matches = [...text.matchAll(TICKER_REGEX)];
  for (const m of matches) if (!TICKER_BLACKLIST.has(m[1])) tickers.add(m[1]);
  // Match common names/hashtags
  const lower = text.toLowerCase();
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (lower.includes(name)) tickers.add(ticker);
  }
  return [...tickers];
}

function escSql(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function cuid(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ─── Push Notifications ──────────────────────────────────────

async function sendPushNotifications(db: any, signal: { id: string; tickers: string[]; action: string; guruHandle: string; guruId: string; score: number }) {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return;

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // Only notify users who follow this guru
  const subs = await db.execute(
    `SELECT wps.* FROM web_push_subscriptions wps
     JOIN user_guru_follows ugf ON ugf.user_id = wps.user_id
     WHERE ugf.guru_id = ${escSql(signal.guruId)}`
  );
  if (subs.rows.length === 0) return;

  const payload = JSON.stringify({
    title: `${signal.action} ${signal.tickers.join(', ')}`,
    body: `${signal.guruHandle} — Score: ${signal.score}/100`,
    data: { signalId: signal.id, url: '/dashboard' },
  });

  for (const sub of subs.rows as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err: any) {
      // Remove expired/invalid subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.execute(`DELETE FROM web_push_subscriptions WHERE id = ${escSql(sub.id)}`);
      }
    }
  }
}

// ─── Main Pipeline ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check: accept Vercel cron header, CRON_SECRET, or allow if no secret set (dev)
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (cronSecret && !isVercelCron) {
    const authHeader = req.headers.get('authorization');
    const xCronSecret = req.headers.get('x-cron-secret');
    if (authHeader !== `Bearer ${cronSecret}` && xCronSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const db = await getDb();
  const results: any[] = [];

  // Only poll gurus that have at least 1 follower (is_active is set when followed)
  const gurusResult = await db.execute(
    `SELECT g.*, COUNT(ugf.user_id) as follower_count
     FROM gurus g
     JOIN user_guru_follows ugf ON g.id = ugf.guru_id
     WHERE g.is_active = 1
     GROUP BY g.id
     HAVING follower_count > 0
     ORDER BY follower_count DESC`
  );
  const gurus = gurusResult.rows as any[];

  for (const guru of gurus) {
    const guruResult: any = { handle: guru.twitter_handle, tweets: 0, signals: 0, errors: [], skipped: [] };
    try {
      // Resolve Twitter user ID if missing
      let twitterUserId = guru.twitter_user_id;
      if (!twitterUserId) {
        twitterUserId = await lookupUserId(guru.twitter_handle);
        if (!twitterUserId) {
          guruResult.errors.push('Could not resolve Twitter ID');
          results.push(guruResult);
          continue;
        }
        await db.execute(`UPDATE gurus SET twitter_user_id = ${escSql(twitterUserId)} WHERE id = ${escSql(guru.id)}`);
      }

      // Get latest signal's tweet_id for since_id
      const lastResult = await db.execute(
        `SELECT tweet_id FROM signals WHERE guru_id = ${escSql(guru.id)} ORDER BY tweet_created_at DESC LIMIT 1`
      );
      const sinceId = (lastResult.rows[0] as any)?.tweet_id || null;

      // Fetch tweets
      const { tweets } = await fetchUserTweets(twitterUserId, sinceId);
      guruResult.tweets = tweets.length;
      if (tweets.length === 0) { results.push(guruResult); continue; }

      for (const tweet of tweets) {
        try {
          // Skip if already processed
          const exists = await db.execute(`SELECT id FROM signals WHERE tweet_id = ${escSql(tweet.id)}`);
          if (exists.rows.length > 0) { guruResult.skipped.push({ id: tweet.id, reason: 'already_processed' }); continue; }

          // Skip retweets
          if (tweet.referenced_tweets?.some(r => r.type === 'retweeted')) { guruResult.skipped.push({ id: tweet.id, reason: 'retweet' }); continue; }

          // Extract tickers
          const tickers = extractTickers(tweet.text);
          if (tickers.length === 0) { guruResult.skipped.push({ id: tweet.id, reason: 'no_tickers', text: tweet.text.slice(0, 100) }); continue; }

          // Check for recent duplicate (same guru + ticker)
          const recentResult = await db.execute(
            `SELECT id, confidence, score, reasoning FROM signals
             WHERE guru_id = ${escSql(guru.id)}
             AND tickers LIKE '%"${tickers[0]}"%'
             AND created_at >= datetime('now', '-4 hours')
             ORDER BY created_at DESC LIMIT 1`
          );

          if (recentResult.rows.length > 0) {
            const recent = recentResult.rows[0] as any;
            const newConf = Math.min(1, (recent.confidence || 0) + 0.1);
            const newScore = Math.min(100, (recent.score || 0) + 5);
            await db.execute(
              `UPDATE signals SET confidence = ${newConf}, score = ${newScore},
               reasoning = ${escSql((recent.reasoning || '') + '\n[+1 mention: ' + tweet.text.slice(0, 80) + '...]')}
               WHERE id = ${escSql(recent.id)}`
            );
            guruResult.signals++;
            continue;
          }

          // Get market data
          const quotes = await getQuotes(tickers);
          let enrichment = '';
          for (const t of tickers) {
            const q = quotes.get(t);
            if (q) enrichment += `${t}: $${q.price} (${q.changePercent > 0 ? '+' : ''}${q.changePercent?.toFixed(2)}%)\n`;
          }

          // LLM analysis
          const isQuote = tweet.referenced_tweets?.some(r => r.type === 'quoted') ?? false;
          const analysis = await analyzeTweet(tweet.text, enrichment, isQuote, guru.twitter_handle);

          // Get entry price
          const tweetTime = new Date(tweet.created_at);
          const priceData = await getPriceAtTime(tickers[0], tweetTime);

          // Save signal
          const signalId = cuid();
          await db.execute(
            `INSERT INTO signals (id, guru_id, tweet_id, tweet_text, tweet_created_at, tickers, action, sentiment, confidence, score, reasoning, timeframe, entry_price, entry_price_time, after_hours, raw_enrichment, processed_at, created_at, updated_at)
             VALUES (${escSql(signalId)}, ${escSql(guru.id)}, ${escSql(tweet.id)}, ${escSql(tweet.text)}, ${escSql(tweetTime.toISOString())}, ${escSql(JSON.stringify(tickers))}, ${escSql(analysis.action)}, ${escSql(analysis.sentiment)}, ${escSql(isQuote ? analysis.confidence * 0.8 : analysis.confidence)}, ${escSql(analysis.score)}, ${escSql(isQuote ? '[Quote Tweet] ' + analysis.reasoning : analysis.reasoning)}, ${escSql(analysis.timeframe)}, ${escSql(priceData?.price ?? null)}, ${escSql(priceData?.time?.toISOString() ?? null)}, ${escSql(priceData?.afterHours ?? false)}, ${escSql(JSON.stringify({ quotes: Object.fromEntries(quotes) }))}, datetime('now'), datetime('now'), datetime('now'))`
          );

          guruResult.signals++;

          // Send push notifications for new signal
          try {
            await sendPushNotifications(db, {
              id: signalId,
              tickers,
              action: analysis.action,
              guruHandle: guru.twitter_handle,
              guruId: guru.id,
              score: analysis.score,
            });
          } catch { /* don't fail pipeline on push error */ }
        } catch (err: any) {
          guruResult.errors.push(`Tweet ${tweet.id}: ${err.message}`);
        }
      }

      // Update guru's last_polled_at
      await db.execute(`UPDATE gurus SET last_polled_at = datetime('now') WHERE id = ${escSql(guru.id)}`);
    } catch (err: any) {
      guruResult.errors.push(err.message);
    }
    results.push(guruResult);
  }

  const totalTweets = results.reduce((s, r) => s + r.tweets, 0);
  const totalSignals = results.reduce((s, r) => s + r.signals, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return NextResponse.json({
    success: true,
    polledAt: new Date().toISOString(),
    summary: {
      gurusPolled: results.length,
      tweetsFound: totalTweets,
      signalsCreated: totalSignals,
      errors: totalErrors,
    },
    gurus: results,
  });
}
