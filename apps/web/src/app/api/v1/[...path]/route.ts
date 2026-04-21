/**
 * Catch-all API route handler.
 * Uses raw SQL via @libsql/client (Turso) or Prisma fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUser() {
  return {
    id: 'dev-001',
    firebaseUid: 'dev-user-001',
    email: 'dev@firasa.app',
    displayName: 'Dev User',
    tier: 'admin',
    onboardingDone: true,
  };
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
    const user = getUser();
    const url = new URL(req.url);

    // GET /api/v1/me
    if (route === 'me') {
      const result = await db.execute(
        `SELECT u.*, up.alert_threshold, up.max_alerts_per_day, up.timezone, up.push_enabled, up.email_enabled
         FROM users u LEFT JOIN user_preferences up ON up.user_id = u.id
         WHERE u.firebase_uid = '${user.firebaseUid}'`
      );
      const u = result.rows[0];
      return NextResponse.json({ data: u || user });
    }

    // GET /api/v1/me/preferences
    if (route === 'me/preferences') {
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
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY s.created_at DESC LIMIT ${limit}`;

      const result = await db.execute(sql);
      const mapped = result.rows.map((s: any) => mapSignal(s));
      const nextCursor = mapped.length === limit ? mapped[mapped.length - 1]?.id : undefined;
      return NextResponse.json({ data: mapped, meta: { cursor: nextCursor } });
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
      const id = 'wps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const userId = 'dev-user';
      // Upsert: delete existing then insert
      await db.execute(`DELETE FROM web_push_subscriptions WHERE endpoint = '${endpoint.replace(/'/g, "''")}'`);
      await db.execute(
        `INSERT INTO web_push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
         VALUES ('${id}', '${userId}', '${endpoint.replace(/'/g, "''")}', '${keys.p256dh.replace(/'/g, "''")}', '${keys.auth.replace(/'/g, "''")}', datetime('now'))`
      );
      return NextResponse.json({ success: true });
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

    return NextResponse.json({ error: `Unknown DELETE route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
