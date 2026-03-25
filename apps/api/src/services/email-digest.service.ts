import { getDb } from './database.js';
import { createLogger } from '../config/logger.js';
import { sendEmail } from '../providers/sendgrid.js';

const log = createLogger('email');

interface DigestEntry {
  guruName: string;
  guruHandle: string;
  tickers: string[];
  action: string;
  score: number;
  tweetText: string;
}

interface UserDigest {
  userId: string;
  email: string;
  displayName: string | null;
  signals: DigestEntry[];
  totalSignals: number;
  topTicker: string | null;
  avgScore: number;
}

/** Generate daily digest data for a user */
export async function generateUserDigest(userId: string): Promise<UserDigest | null> {
  const db = getDb();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });

  if (!user || !user.preferences?.emailEnabled) return null;

  // Get signals from the last 24 hours for gurus the user follows
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const followedGurus = await db.userGuruConfig.findMany({
    where: { userId, isFollowing: true },
    select: { guruId: true },
  });

  const guruIds = followedGurus.map((g) => g.guruId);
  if (guruIds.length === 0) return null;

  const signals = await db.signal.findMany({
    where: {
      guruId: { in: guruIds },
      createdAt: { gte: oneDayAgo },
    },
    include: { guru: { select: { displayName: true, twitterHandle: true } } },
    orderBy: { score: 'desc' },
  });

  if (signals.length === 0) return null;

  const entries: DigestEntry[] = signals.map((s) => ({
    guruName: s.guru.displayName,
    guruHandle: s.guru.twitterHandle,
    tickers: JSON.parse(s.tickers as string) as string[],
    action: s.action,
    score: s.score,
    tweetText: s.tweetText.substring(0, 140),
  }));

  // Find the most mentioned ticker
  const tickerCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const t of entry.tickers) {
      tickerCounts.set(t, (tickerCounts.get(t) ?? 0) + 1);
    }
  }
  const topTicker = tickerCounts.size > 0
    ? [...tickerCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const avgScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;

  return {
    userId,
    email: user.email,
    displayName: user.displayName,
    signals: entries.slice(0, 10), // Top 10 by score
    totalSignals: entries.length,
    topTicker,
    avgScore: Math.round(avgScore),
  };
}

/** Format digest as HTML email */
export function formatDigestHtml(digest: UserDigest): string {
  const greeting = digest.displayName ? `Hey ${digest.displayName}` : 'Hey there';
  const signalRows = digest.signals
    .map(
      (s) => `
      <tr style="border-bottom: 1px solid #1f2937;">
        <td style="padding: 12px 8px; color: #9ca3af;">@${s.guruHandle}</td>
        <td style="padding: 12px 8px;">
          <span style="color: ${s.action === 'BUY' ? '#10b981' : s.action === 'SELL' ? '#ef4444' : '#eab308'}; font-weight: 600;">
            ${s.action}
          </span>
        </td>
        <td style="padding: 12px 8px; color: #d1d5db;">${s.tickers.map((t) => `$${t}`).join(', ')}</td>
        <td style="padding: 12px 8px; color: #10b981; text-align: right;">${s.score}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="max-width: 600px; margin: 0 auto; background: #111827; color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="padding: 32px 24px; background: #030712; border-bottom: 2px solid #10b981;">
        <h1 style="margin: 0; font-size: 24px;">🔥 Firasa Daily Digest</h1>
      </div>
      <div style="padding: 24px;">
        <p style="color: #9ca3af; font-size: 16px;">${greeting}, here's your daily signal summary:</p>
        
        <div style="display: flex; gap: 16px; margin: 20px 0;">
          <div style="background: #1f2937; padding: 16px; border-radius: 12px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #10b981;">${digest.totalSignals}</div>
            <div style="font-size: 12px; color: #6b7280;">Signals</div>
          </div>
          <div style="background: #1f2937; padding: 16px; border-radius: 12px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #10b981;">${digest.avgScore}</div>
            <div style="font-size: 12px; color: #6b7280;">Avg Score</div>
          </div>
          ${digest.topTicker ? `
          <div style="background: #1f2937; padding: 16px; border-radius: 12px; flex: 1; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #eab308;">$${digest.topTicker}</div>
            <div style="font-size: 12px; color: #6b7280;">Top Ticker</div>
          </div>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="border-bottom: 2px solid #374151;">
              <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">GURU</th>
              <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">ACTION</th>
              <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">TICKERS</th>
              <th style="padding: 8px; text-align: right; color: #6b7280; font-size: 12px;">SCORE</th>
            </tr>
          </thead>
          <tbody>${signalRows}</tbody>
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://firasa.app/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View All Signals →
          </a>
        </div>
      </div>
      <div style="padding: 16px 24px; background: #030712; border-top: 1px solid #1f2937; text-align: center;">
        <p style="color: #4b5563; font-size: 12px; margin: 0;">
          Firasa Trading Intelligence · <a href="https://firasa.app/settings" style="color: #6b7280;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;
}

/** Format digest as plain text */
export function formatDigestText(digest: UserDigest): string {
  const greeting = digest.displayName ? `Hey ${digest.displayName}` : 'Hey there';
  const lines = [
    `🔥 Firasa Daily Digest`,
    '',
    `${greeting}, here's your daily summary:`,
    `📊 ${digest.totalSignals} signals | Avg Score: ${digest.avgScore}${digest.topTicker ? ` | Top: $${digest.topTicker}` : ''}`,
    '',
    '--- Top Signals ---',
    ...digest.signals.map(
      (s) => `${s.action} ${s.tickers.map((t) => `$${t}`).join(', ')} (Score: ${s.score}) — @${s.guruHandle}`
    ),
    '',
    'View all signals: https://firasa.app/dashboard',
  ];
  return lines.join('\n');
}

/** Run digest for all eligible users */
export async function runDailyDigest(): Promise<{ sent: number; skipped: number }> {
  const db = getDb();
  
  const users = await db.user.findMany({
    where: {
      preferences: { emailEnabled: true },
    },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const { id } of users) {
    const digest = await generateUserDigest(id);
    if (!digest) {
      skipped++;
      continue;
    }

    const html = formatDigestHtml(digest);
    const text = formatDigestText(digest);
    const delivered = await sendEmail({
      to: digest.email,
      subject: `🔥 Firasa Daily: ${digest.totalSignals} signals | Avg Score ${digest.avgScore}`,
      html,
      text,
    });
    if (!delivered) {
      log.warn({ email: digest.email }, 'SendGrid not configured — skipped digest');
    }
    sent++;
  }

  return { sent, skipped };
}
