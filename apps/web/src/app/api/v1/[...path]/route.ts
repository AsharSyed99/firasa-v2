/**
 * Catch-all API route handler.
 * Handles /api/v1/* requests using Prisma directly (no Express).
 * This replaces the separate API server for Vercel serverless deployment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dev auth: always returns the seeded dev user
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
      const dbUser = await db.user.findUnique({
        where: { firebaseUid: user.firebaseUid },
        include: { preferences: true },
      });
      return NextResponse.json({ data: dbUser || user });
    }

    // GET /api/v1/me/preferences
    if (route === 'me/preferences') {
      const prefs = await db.userPreference.findUnique({ where: { userId: user.id } });
      return NextResponse.json({
        data: prefs || {
          alertThreshold: 50,
          maxAlertsPerDay: 10,
          timezone: 'America/New_York',
          pushEnabled: true,
          emailEnabled: false,
        },
      });
    }

    // GET /api/v1/signals
    if (route === 'signals') {
      const guruId = url.searchParams.get('guruId');
      const action = url.searchParams.get('action');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const cursor = url.searchParams.get('cursor');

      const where: Record<string, unknown> = {};
      if (guruId) where.guruId = guruId;
      if (action && action !== 'ALL') where.action = action;

      const signals = await db.signal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { guru: { select: { twitterHandle: true, displayName: true, category: true } } },
      });

      const mapped = signals.map((s: any) => ({
        id: s.id,
        guruId: s.guruId,
        guruHandle: s.guru?.twitterHandle,
        guruName: s.guru?.displayName,
        guruCategory: s.guru?.category,
        tweetId: s.tweetId,
        tweetText: s.tweetText,
        tweetCreatedAt: s.tweetCreatedAt?.toISOString(),
        tickers: typeof s.tickers === 'string' ? JSON.parse(s.tickers) : s.tickers,
        action: s.action,
        sentiment: s.sentiment,
        confidence: s.confidence,
        score: s.score,
        reasoning: s.reasoning,
        timeframe: s.timeframe,
        entryPrice: s.entryPrice,
        afterHours: !!s.afterHours,
        smartMoneyScore: s.smartMoneyScore,
        smartMoneySummary: s.smartMoneySummary,
        outcomes: {
          '1h': s.outcome1h, '4h': s.outcome4h, '1d': s.outcome1d,
          '3d': s.outcome3d, '1w': s.outcome1w, '1m': s.outcome1m,
        },
        prices: {
          '1h': s.price1hLater, '4h': s.price4hLater, '1d': s.price1dLater,
          '3d': s.price3dLater, '1w': s.price1wLater, '1m': s.price1mLater,
        },
        createdAt: s.createdAt?.toISOString(),
      }));

      const nextCursor = signals.length === limit ? signals[signals.length - 1]?.id : undefined;
      return NextResponse.json({ data: mapped, meta: { cursor: nextCursor } });
    }

    // GET /api/v1/signals/:id
    if (route.startsWith('signals/') && !route.includes('/')) {
      const id = route.replace('signals/', '');
      const s = await db.signal.findUnique({
        where: { id },
        include: { guru: true },
      }) as any;
      if (!s) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });

      return NextResponse.json({
        data: {
          id: s.id, guruId: s.guruId,
          guruHandle: s.guru?.twitterHandle, guruName: s.guru?.displayName,
          tweetId: s.tweetId, tweetText: s.tweetText,
          tweetCreatedAt: s.tweetCreatedAt?.toISOString(),
          tickers: typeof s.tickers === 'string' ? JSON.parse(s.tickers) : s.tickers,
          action: s.action, sentiment: s.sentiment,
          confidence: s.confidence, score: s.score, reasoning: s.reasoning,
          timeframe: s.timeframe, entryPrice: s.entryPrice, afterHours: !!s.afterHours,
          imageAnalysis: s.imageAnalysis, rawEnrichment: s.rawEnrichment,
          smartMoneyScore: s.smartMoneyScore, smartMoneySummary: s.smartMoneySummary,
          outcomes: {
            '1h': s.outcome1h, '4h': s.outcome4h, '1d': s.outcome1d,
            '3d': s.outcome3d, '1w': s.outcome1w, '1m': s.outcome1m,
          },
          prices: {
            '1h': s.price1hLater, '4h': s.price4hLater, '1d': s.price1dLater,
            '3d': s.price3dLater, '1w': s.price1wLater, '1m': s.price1mLater,
          },
          createdAt: s.createdAt?.toISOString(),
        },
      });
    }

    // GET /api/v1/gurus
    if (route === 'gurus') {
      const gurus = await db.guru.findMany({
        where: { isActive: true },
        orderBy: { displayName: 'asc' },
      });
      const mapped = gurus.map((g: any) => ({
        id: g.id,
        twitterHandle: g.twitterHandle,
        displayName: g.displayName,
        category: g.category,
        reliability: g.reliability,
        isActive: g.isActive,
        totalSignals: g.totalSignals,
        profitableSignals: g.profitableSignals,
        avgScore: g.avgScore,
      }));
      return NextResponse.json({ data: mapped });
    }

    // GET /api/v1/flags
    if (route === 'flags') {
      const flags = await db.featureFlag.findMany();
      const data: Record<string, boolean> = {};
      for (const f of flags) data[f.name] = f.enabled;
      return NextResponse.json({ data });
    }

    // GET /api/v1/push/vapid-key
    if (route === 'push/vapid-key') {
      return NextResponse.json({
        data: { publicKey: process.env.VAPID_PUBLIC_KEY || '' },
      });
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
      const signals = await db.signal.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      const bullish = signals.filter((s: any) => s.sentiment === 'BULLISH').length;
      const bearish = signals.filter((s: any) => s.sentiment === 'BEARISH').length;
      return NextResponse.json({
        data: {
          overallSentiment: bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL',
          sentimentScore: signals.length ? Math.round((bullish / signals.length) * 100) : 50,
          topBullishTickers: [],
          topBearishTickers: [],
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
    await req.json().catch(() => ({}));

    // POST /api/v1/me/push/subscribe
    if (route === 'me/push/subscribe') {
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

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    const route = path.join('/');

    if (route === 'me/push/unsubscribe') {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown DELETE route: ${route}` }, { status: 404 });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
