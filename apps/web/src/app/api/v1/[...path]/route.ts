/**
 * Catch-all API route handler.
 * Uses raw SQL via @libsql/client (Turso) or Prisma fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthUser, getFullUser } from '@/lib/auth/helpers';
import { getStripe, PRICE_IDS } from '@/lib/stripe';
import { TIER_LIMITS } from '@firasa/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getTierLimits(tier: string) {
  return TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
}

function genId(prefix: string) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function resolveUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  return authUser;
}

function parseTickers(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return [v]; }
  }
  return [];
}

function mapSignal(s: any) {
  return {
    id: s.id,
    guruId: s.guru_id,
    guruHandle: s.twitter_handle,
    guruName: s.display_name,
    guruCategory: s.category,
    tweetId: s.tweet_id,
    tweetText: s.tweet_text,
    tweetCreatedAt: s.tweet_created_at,
    tickers: parseTickers(s.tickers),
    action: s.action,
    sentiment: s.sentiment,
    confidence: s.confidence,
    score: s.score,
    reasoning: s.reasoning,
    timeframe: s.timeframe,
    entryPrice: s.entry_price,
    afterHours: !!s.after_hours,
    smartMoneyScore: s.smart_money_score,
    smartMoneySummary: s.smart_money_summary,
    outcomes: {
      '1h': s.outcome_1h, '4h': s.outcome_4h, '1d': s.outcome_1d,
      '3d': s.outcome_3d, '1w': s.outcome_1w, '1m': s.outcome_1m,
    },
    prices: {
      '1h': s.price_1h_later, '4h': s.price_4h_later, '1d': s.price_1d_later,
      '3d': s.price_3d_later, '1w': s.price_1w_later, '1m': s.price_1m_later,
    },
    createdAt: s.created_at,
  };
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const route = path.join('/');
    const db = await getDb();
    const user = await resolveUser();
    const url = new URL(req.url);

    // GET /api/v1/me
    if (route === 'me') {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const u = await getFullUser(user.id);
      return NextResponse.json({
        data: u || {
          id: user.id,
          display_name: user.displayName,
          tier: user.tier,
          onboarding_done: user.onboardingDone,
        },
      });
    }

    // GET /api/v1/me/preferences
    if (route === 'me/preferences') {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const result = await db.execute(
        `SELECT * FROM user_preferences WHERE user_id = '${user.id}'`
      );
      return NextResponse.json({
        data: result.rows[0] || {
          alertThreshold: 50, maxAlertsPerDay: 10,
          timezone: 'America/New_York', pushEnabled: true, emailEnabled: false,
        },
      });
    }

    // GET /api/v1/signals
    if (route === 'signals') {
      const guruId = url.searchParams.get('guruId');
      const action = url.searchParams.get('action');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const cursor = url.searchParams.get('cursor');

      let sql = `SELECT s.*, g.twitter_handle, g.display_name, g.category
                 FROM signals s JOIN gurus g ON s.guru_id = g.id`;
      const conditions: string[] = [];
      if (guruId) conditions.push(`s.guru_id = '${guruId.replace(/'/g, "''")}'`);
      if (action && action !== 'ALL') conditions.push(`s.action = '${action.replace(/'/g, "''")}'`);
      if (cursor) conditions.push(`s.created_at < (SELECT created_at FROM signals WHERE id = '${cursor.replace(/'/g, "''")}')`);

      // Tier enforcement: free users don't see signals newer than 1 hour
      const userTier = user?.tier || 'free';
      let delayed = false;
      if (userTier === 'free') {
        conditions.push(`s.created_at < datetime('now', '-1 hour')`);
        delayed = true;
      }

      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY s.created_at DESC LIMIT ${limit}`;

      const result = await db.execute(sql);
      const mapped = result.rows.map((s: any) => mapSignal(s));
      const nextCursor = mapped.length === limit ? mapped[mapped.length - 1]?.id : undefined;
      return NextResponse.json({ data: mapped, meta: { cursor: nextCursor, delayed } });
    }

    // GET /api/v1/signals/:id
    if (route.startsWith('signals/')) {
      const id = route.slice('signals/'.length);
      if (id && !id.includes('/')) {
        const result = await db.execute(
          `SELECT s.*, g.twitter_handle, g.display_name, g.category
           FROM signals s JOIN gurus g ON s.guru_id = g.id
           WHERE s.id = '${id.replace(/'/g, "''")}'`
        );
        if (!result.rows[0]) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
        const s = result.rows[0] as any;
        return NextResponse.json({
          data: {
            ...mapSignal(s),
            imageAnalysis: s.image_analysis,
            rawEnrichment: s.raw_enrichment,
          },
        });
      }
    }

    // GET /api/v1/gurus
    if (route === 'gurus') {
      const result = await db.execute(
        `SELECT * FROM gurus WHERE is_active = 1 ORDER BY display_name ASC`
      );
      const mapped = result.rows.map((g: any) => ({
        id: g.id,
        twitterHandle: g.twitter_handle,
        displayName: g.display_name,
        category: g.category,
        reliability: g.reliability,
        isActive: !!g.is_active,
        totalSignals: g.total_signals,
        profitableSignals: g.profitable_signals,
        avgScore: g.avg_score,
      }));
      return NextResponse.json({ data: mapped });
    }

    // GET /api/v1/flags
    if (route === 'flags') {
      const result = await db.execute('SELECT name, enabled FROM feature_flags');
      const data: Record<string, boolean> = {};
      for (const f of result.rows as any[]) data[f.name] = !!f.enabled;
      return NextResponse.json({ data });
    }

    // GET /api/v1/push/vapid-key
    if (route === 'push/vapid-key') {
      return NextResponse.json({ data: { publicKey: process.env.VAPID_PUBLIC_KEY || '' } });
    }

    // GET /api/v1/push/test — send a test notification to all subscribers
    if (route === 'push/test') {
      const webpush = (await import('web-push')).default;
      const vapidPublic = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
      const vapidSubject = process.env.VAPID_SUBJECT;
      if (!vapidPublic || !vapidPrivate || !vapidSubject) {
        return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
      }
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      const subs = await db.execute('SELECT * FROM web_push_subscriptions');
      const payload = JSON.stringify({
        title: '🔔 Firasa Test',
        body: 'Push notifications are working!',
        data: { url: '/dashboard' },
      });
      let sent = 0, failed = 0;
      for (const sub of subs.rows as any[]) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.execute(`DELETE FROM web_push_subscriptions WHERE id = '${sub.id}'`);
          }
        }
      }
      return NextResponse.json({ data: { sent, failed, total: subs.rows.length } });
    }

    // GET /api/v1/push/subscriptions (debug)
    if (route === 'push/subscriptions') {
      const subs = await db.execute('SELECT id, user_id, endpoint, created_at FROM web_push_subscriptions');
      return NextResponse.json({ data: subs.rows });
    }

    // GET /api/v1/notifications
    if (route === 'notifications') {
      return NextResponse.json({ data: [], meta: {} });
    }

    // GET /api/v1/notifications/count
    if (route === 'notifications/count') {
      return NextResponse.json({ data: { count: 0 } });
    }

    // GET /api/v1/watchlist
    if (route === 'watchlist') {
      return NextResponse.json({ data: [] });
    }

    // GET /api/v1/mood
    if (route === 'mood') {
      const result = await db.execute(
        `SELECT sentiment FROM signals WHERE created_at >= datetime('now', '-1 day')`
      );
      const signals = result.rows as any[];
      const bullish = signals.filter(s => s.sentiment === 'BULLISH').length;
      const bearish = signals.filter(s => s.sentiment === 'BEARISH').length;
      return NextResponse.json({
        data: {
          overallSentiment: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL',
          sentimentScore: signals.length ? Math.round((bullish / signals.length) * 100) : 50,
          topBullishTickers: [], topBearishTickers: [],
          guruConsensus: { bullish, bearish, total: signals.length },
          summary: `${signals.length} signals in last 24h`,
          signalVolume: signals.length > 20 ? 'HIGH' : signals.length > 5 ? 'MEDIUM' : 'LOW',
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // GET /api/v1/me/gurus
    if (route === 'me/gurus') {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const result = await db.execute(
        `SELECT g.* FROM gurus g JOIN user_guru_follows ugf ON g.id = ugf.guru_id WHERE ugf.user_id = '${user.id.replace(/'/g, "''")}'`
      );
      const mapped = result.rows.map((g: any) => ({
        id: g.id,
        twitterHandle: g.twitter_handle,
        displayName: g.display_name,
        category: g.category,
        reliability: g.reliability,
        isActive: !!g.is_active,
        totalSignals: g.total_signals,
        profitableSignals: g.profitable_signals,
        avgScore: g.avg_score,
      }));
      return NextResponse.json({ data: mapped });
    }

    // GET /api/v1/me/morning-brief
    if (route === 'me/morning-brief') {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Top signals from last 24h
      const topSignals = await db.execute(
        `SELECT s.*, g.twitter_handle, g.display_name, g.category
         FROM signals s JOIN gurus g ON s.guru_id = g.id
         WHERE s.created_at >= datetime('now', '-1 day')
         ORDER BY s.confidence DESC LIMIT 5`
      );
      // Consensus: tickers mentioned by 3+ gurus in 24h
      const consensus = await db.execute(
        `SELECT s.tickers, COUNT(DISTINCT s.guru_id) as guru_count
         FROM signals s WHERE s.created_at >= datetime('now', '-1 day')
         GROUP BY s.tickers HAVING guru_count >= 3
         ORDER BY guru_count DESC LIMIT 5`
      );
      // Overall mood
      const mood = await db.execute(
        `SELECT
           SUM(CASE WHEN sentiment = 'BULLISH' THEN 1 ELSE 0 END) as bullish,
           SUM(CASE WHEN sentiment = 'BEARISH' THEN 1 ELSE 0 END) as bearish,
           COUNT(*) as total
         FROM signals WHERE created_at >= datetime('now', '-1 day')`
      );
      const m = mood.rows[0] as any;
      return NextResponse.json({
        data: {
          topSignals: topSignals.rows.map((s: any) => mapSignal(s)),
          consensus: consensus.rows.map((c: any) => ({
            tickers: parseTickers(c.tickers),
            guruCount: c.guru_count,
          })),
          mood: {
            bullish: Number(m?.bullish || 0),
            bearish: Number(m?.bearish || 0),
            total: Number(m?.total || 0),
          },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // GET /api/v1/gurus/leaderboard
    if (route === 'gurus/leaderboard') {
      const result = await db.execute(
        `SELECT g.*,
           COUNT(s.id) as signal_count,
           AVG(s.confidence) as avg_confidence,
           SUM(CASE WHEN s.outcome_1d = 'WIN' THEN 1 ELSE 0 END) as wins
         FROM gurus g LEFT JOIN signals s ON g.id = s.guru_id
         GROUP BY g.id ORDER BY wins DESC, avg_confidence DESC LIMIT 20`
      );
      const mapped = result.rows.map((g: any) => ({
        id: g.id,
        twitterHandle: g.twitter_handle,
        displayName: g.display_name,
        category: g.category,
        reliability: g.reliability,
        signalCount: Number(g.signal_count || 0),
        avgConfidence: Number(g.avg_confidence || 0),
        wins: Number(g.wins || 0),
      }));
      return NextResponse.json({ data: mapped });
    }

    // GET /api/v1/gurus/:id/dna
    if (route.match(/^gurus\/[^/]+\/dna$/)) {
      const guruId = route.split('/')[1];
      const guru = await db.execute(
        `SELECT * FROM gurus WHERE id = '${guruId.replace(/'/g, "''")}'`
      );
      if (!guru.rows[0]) return NextResponse.json({ error: 'Guru not found' }, { status: 404 });
      const signals = await db.execute(
        `SELECT sentiment, confidence, tickers, timeframe, action FROM signals WHERE guru_id = '${guruId.replace(/'/g, "''")}'`
      );
      const rows = signals.rows as any[];
      const bullish = rows.filter(r => r.sentiment === 'BULLISH').length;
      const bearish = rows.filter(r => r.sentiment === 'BEARISH').length;
      const total = rows.length || 1;
      // Preferred tickers
      const tickerMap: Record<string, number> = {};
      for (const r of rows) {
        for (const t of parseTickers(r.tickers)) {
          tickerMap[t] = (tickerMap[t] || 0) + 1;
        }
      }
      const preferredTickers = Object.entries(tickerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ticker, count]) => ({ ticker, count }));
      // Preferred timeframes
      const tfMap: Record<string, number> = {};
      for (const r of rows) {
        if (r.timeframe) tfMap[r.timeframe] = (tfMap[r.timeframe] || 0) + 1;
      }
      const preferredTimeframes = Object.entries(tfMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([timeframe, count]) => ({ timeframe, count }));
      const g = guru.rows[0] as any;
      return NextResponse.json({
        data: {
          id: g.id,
          displayName: g.display_name,
          twitterHandle: g.twitter_handle,
          bullishRatio: Math.round((bullish / total) * 100),
          bearishRatio: Math.round((bearish / total) * 100),
          avgConfidence: rows.length ? rows.reduce((s, r) => s + Number(r.confidence || 0), 0) / rows.length : 0,
          totalSignals: rows.length,
          preferredTickers,
          preferredTimeframes,
        },
      });
    }

    // GET /api/v1/analytics/overview
    if (route === 'analytics/overview') {
      const result = await db.execute(
        `SELECT
           COUNT(*) as total_signals,
           COUNT(DISTINCT guru_id) as active_gurus,
           AVG(confidence) as avg_confidence,
           SUM(CASE WHEN sentiment = 'BULLISH' THEN 1 ELSE 0 END) as bullish,
           SUM(CASE WHEN sentiment = 'BEARISH' THEN 1 ELSE 0 END) as bearish
         FROM signals WHERE created_at >= datetime('now', '-7 days')`
      );
      const r = result.rows[0] as any;
      return NextResponse.json({
        data: {
          totalSignals: Number(r?.total_signals || 0),
          activeGurus: Number(r?.active_gurus || 0),
          avgConfidence: Number(r?.avg_confidence || 0),
          bullish: Number(r?.bullish || 0),
          bearish: Number(r?.bearish || 0),
        },
      });
    }

    // GET /api/v1/analytics/guru/:guruId
    if (route.match(/^analytics\/guru\/[^/]+$/)) {
      const guruId = route.split('/')[2];
      const guru = await db.execute(
        `SELECT * FROM gurus WHERE id = '${guruId.replace(/'/g, "''")}'`
      );
      if (!guru.rows[0]) return NextResponse.json({ error: 'Guru not found' }, { status: 404 });
      const stats = await db.execute(
        `SELECT
           COUNT(*) as total_signals,
           AVG(confidence) as avg_confidence,
           SUM(CASE WHEN sentiment = 'BULLISH' THEN 1 ELSE 0 END) as bullish,
           SUM(CASE WHEN sentiment = 'BEARISH' THEN 1 ELSE 0 END) as bearish,
           SUM(CASE WHEN outcome_1d = 'WIN' THEN 1 ELSE 0 END) as wins
         FROM signals WHERE guru_id = '${guruId.replace(/'/g, "''")}'`
      );
      const s = stats.rows[0] as any;
      const g = guru.rows[0] as any;
      return NextResponse.json({
        data: {
          id: g.id,
          displayName: g.display_name,
          twitterHandle: g.twitter_handle,
          totalSignals: Number(s?.total_signals || 0),
          avgConfidence: Number(s?.avg_confidence || 0),
          bullish: Number(s?.bullish || 0),
          bearish: Number(s?.bearish || 0),
          wins: Number(s?.wins || 0),
        },
      });
    }

    // GET /api/v1/signals/streak
    if (route === 'signals/streak') {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const result = await db.execute(
        `SELECT s.outcome_1d, s.guru_id, g.display_name
         FROM signals s
         JOIN gurus g ON s.guru_id = g.id
         JOIN user_guru_follows ugf ON ugf.guru_id = g.id AND ugf.user_id = '${user.id.replace(/'/g, "''")}'
         ORDER BY s.created_at DESC LIMIT 100`
      );
      // Count consecutive wins from most recent
      let streak = 0;
      for (const row of result.rows as any[]) {
        if (row.outcome_1d === 'WIN') streak++;
        else break;
      }
      return NextResponse.json({ data: { streak, total: result.rows.length } });
    }

    // GET /api/v1/signals/consensus
    if (route === 'signals/consensus') {
      const result = await db.execute(
        `SELECT s.tickers, s.sentiment, COUNT(DISTINCT s.guru_id) as guru_count,
           GROUP_CONCAT(DISTINCT g.display_name) as guru_names
         FROM signals s JOIN gurus g ON s.guru_id = g.id
         WHERE s.created_at >= datetime('now', '-1 day')
         GROUP BY s.tickers, s.sentiment
         HAVING guru_count >= 3
         ORDER BY guru_count DESC`
      );
      const mapped = result.rows.map((r: any) => ({
        tickers: parseTickers(r.tickers),
        sentiment: r.sentiment,
        guruCount: Number(r.guru_count),
        guruNames: r.guru_names ? String(r.guru_names).split(',') : [],
      }));
      return NextResponse.json({ data: mapped });
    }

    return NextResponse.json({ error: `Unknown route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const route = path.join('/');
    const body = await req.json().catch(() => ({})) as any;

    if (route === 'me/push/subscribe') {
      const { endpoint, keys } = body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return NextResponse.json({ error: 'Missing endpoint or keys' }, { status: 400 });
      }
      const db = await getDb();
      const user = await resolveUser();
      const userId = user?.id || 'anonymous';
      const id = 'wps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      // Ensure user exists for FK
      if (userId === 'anonymous') {
        await db.execute(
          `INSERT OR IGNORE INTO users (id, email, display_name, tier, created_at, updated_at)
           VALUES ('anonymous', '', 'Anonymous', 'free', datetime('now'), datetime('now'))`
        );
      }
      // Upsert: delete existing then insert
      await db.execute(`DELETE FROM web_push_subscriptions WHERE endpoint = '${endpoint.replace(/'/g, "''")}'`);
      await db.execute(
        `INSERT INTO web_push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
         VALUES ('${id}', '${userId}', '${endpoint.replace(/'/g, "''")}', '${keys.p256dh.replace(/'/g, "''")}', '${keys.auth.replace(/'/g, "''")}', datetime('now'))`
      );
      return NextResponse.json({ success: true });
    }

    // POST /api/v1/billing/checkout
    if (route === 'billing/checkout') {
      const user = await resolveUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const tier = body.tier as string;
      if (tier !== 'pro' && tier !== 'premium') {
        return NextResponse.json({ error: 'Invalid tier. Must be pro or premium.' }, { status: 400 });
      }
      const priceId = PRICE_IDS[tier];
      const origin = new URL(req.url).origin;
      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/billing?success=true`,
        cancel_url: `${origin}/billing?canceled=true`,
        metadata: { userId: user.id },
      });
      return NextResponse.json({ data: { url: session.url } });
    }

    // POST /api/v1/billing/portal
    if (route === 'billing/portal') {
      const user = await resolveUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const db = await getDb();
      const result = await db.execute(
        `SELECT stripe_customer_id FROM users WHERE id = '${user.id.replace(/'/g, "''")}'`
      );
      const customerId = (result.rows[0] as any)?.stripe_customer_id;
      if (!customerId) {
        return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
      }
      const origin = new URL(req.url).origin;
      const session = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/billing`,
      });
      return NextResponse.json({ data: { url: session.url } });
    }

    // POST /api/v1/me/gurus/follow
    if (route === 'me/gurus/follow') {
      const user = await resolveUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { guruId } = body;
      if (!guruId) return NextResponse.json({ error: 'guruId is required' }, { status: 400 });
      const db = await getDb();
      const limits = getTierLimits(user.tier);
      // Check current follow count
      const countResult = await db.execute(
        `SELECT COUNT(*) as cnt FROM user_guru_follows WHERE user_id = '${user.id.replace(/'/g, "''")}'`
      );
      const currentCount = Number((countResult.rows[0] as any)?.cnt || 0);
      if (currentCount >= limits.maxGurus) {
        return NextResponse.json({
          error: `Follow limit reached. Your ${user.tier} tier allows ${limits.maxGurus} gurus. Upgrade to follow more.`,
        }, { status: 403 });
      }
      const id = genId('ugf');
      await db.execute(
        `INSERT OR IGNORE INTO user_guru_follows (id, user_id, guru_id) VALUES ('${id}', '${user.id.replace(/'/g, "''")}', '${guruId.replace(/'/g, "''")}')`
      );
      return NextResponse.json({ data: { id, guruId } });
    }

    return NextResponse.json({ error: `Unknown POST route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const route = path.join('/');
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    if (route === 'me/preferences') {
      return NextResponse.json({ data: body });
    }

    return NextResponse.json({ error: `Unknown PATCH route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const route = path.join('/');

    if (route === 'me/push/unsubscribe') {
      const body = await req.json().catch(() => ({})) as any;
      if (body.endpoint) {
        const db = await getDb();
        await db.execute(`DELETE FROM web_push_subscriptions WHERE endpoint = '${body.endpoint.replace(/'/g, "''")}'`);
      }
      return NextResponse.json({ success: true });
    }

    // DELETE /api/v1/me/gurus/unfollow
    if (route === 'me/gurus/unfollow') {
      const user = await resolveUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json().catch(() => ({})) as any;
      const { guruId } = body;
      if (!guruId) return NextResponse.json({ error: 'guruId is required' }, { status: 400 });
      const db = await getDb();
      await db.execute(
        `DELETE FROM user_guru_follows WHERE user_id = '${user.id.replace(/'/g, "''")}' AND guru_id = '${guruId.replace(/'/g, "''")}'`
      );
      return NextResponse.json({ data: { unfollowed: guruId } });
    }

    return NextResponse.json({ error: `Unknown DELETE route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
