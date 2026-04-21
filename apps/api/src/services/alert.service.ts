import { getDb } from './database.js';
import { sendWhatsApp } from '../providers/twilio.js';
import { sendPushNotification } from '../providers/fcm.js';
import { sendWebPushNotification } from '../providers/web-push.js';
import type { SignalAction } from '@firasa/shared';

interface SignalForAlert {
  id: string;
  guruId: string;
  tickers: string;
  action: SignalAction;
  score: number;
  reasoning: string | null;
  tweetText: string;
  entryPrice: number | null;
}

/**
 * Fan out a new signal to all subscribed users.
 * Respects per-user: guru config, alert threshold, quiet hours, daily quota, channel prefs.
 * Skips UNCLEAR and HOLD signals entirely.
 */
export async function fanOutAlert(signal: SignalForAlert): Promise<{
  whatsappSent: number;
  pushSent: number;
  webPushSent: number;
  skipped: number;
}> {
  // Never alert on UNCLEAR or HOLD
  if (signal.action === 'UNCLEAR' || signal.action === 'HOLD') {
    return { whatsappSent: 0, pushSent: 0, webPushSent: 0, skipped: 0 };
  }

  const db = getDb();
  const stats = { whatsappSent: 0, pushSent: 0, webPushSent: 0, skipped: 0 };

  // Get all users who follow this guru and aren't muted
  const subscribers = await db.userGuruConfig.findMany({
    where: {
      guruId: signal.guruId,
      isFollowing: true,
      isMuted: false,
    },
    include: {
      user: {
        include: {
          preferences: true,
          quota: true,
          devices: true,
          webPushSubs: true,
        },
      },
    },
  });

  const tickers = JSON.parse(signal.tickers) as string[];
  const now = new Date();

  for (const sub of subscribers) {
    const user = sub.user;
    const prefs = user.preferences;

    // Skip if no preferences (shouldn't happen but be safe)
    if (!prefs) {
      stats.skipped++;
      continue;
    }

    // Check alert threshold
    if (signal.score < prefs.alertThreshold) {
      stats.skipped++;
      continue;
    }

    // Check quiet hours
    if (isInQuietHours(now, prefs.quietHoursStart, prefs.quietHoursEnd, prefs.timezone)) {
      stats.skipped++;
      continue;
    }

    // Check daily quota
    const quota = user.quota;
    const today = now.toISOString().split('T')[0];
    if (quota && quota.lastResetDate === today && quota.alertsSentToday >= prefs.maxAlertsPerDay) {
      stats.skipped++;
      continue;
    }

    // Check ticker whitelist/blacklist
    if (prefs.tickerWhitelist) {
      const whitelist = JSON.parse(prefs.tickerWhitelist) as string[];
      if (whitelist.length > 0 && !tickers.some((t) => whitelist.includes(t))) {
        stats.skipped++;
        continue;
      }
    }
    if (prefs.tickerBlacklist) {
      const blacklist = JSON.parse(prefs.tickerBlacklist) as string[];
      if (tickers.some((t) => blacklist.includes(t))) {
        stats.skipped++;
        continue;
      }
    }

    const message = formatAlertMessage(signal, tickers);

    // Send WhatsApp
    if (prefs.whatsappEnabled && prefs.whatsappNumber) {
      try {
        await sendWhatsApp(prefs.whatsappNumber, message);
        await logAlert(user.id, signal.id, 'whatsapp', 'sent');
        stats.whatsappSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logAlert(user.id, signal.id, 'whatsapp', 'failed', msg);
      }
    }

    // Send push to all FCM devices
    if (prefs.pushEnabled && user.devices.length > 0) {
      for (const device of user.devices) {
        try {
          const title = `${signal.action} ${tickers[0]} (Score: ${signal.score})`;
          const result = await sendPushNotification(device.fcmToken, title, message, {
            signalId: signal.id,
            action: signal.action,
          });
          if (result) {
            await logAlert(user.id, signal.id, 'push_fcm', 'sent');
            stats.pushSent++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await logAlert(user.id, signal.id, 'push_fcm', 'failed', msg);
        }
      }
    }

    // Send web push to all browser subscriptions
    if (prefs.pushEnabled && user.webPushSubs.length > 0) {
      const title = `${signal.action} ${tickers[0]} (Score: ${signal.score})`;
      for (const sub of user.webPushSubs) {
        const result = await sendWebPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          title,
          message,
          { signalId: signal.id, action: signal.action, url: '/dashboard' },
        );
        if (result === true) {
          await logAlert(user.id, signal.id, 'push_web', 'sent');
          stats.webPushSent++;
        } else if (result === 'gone') {
          // Stale subscription — clean up
          await db.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          await logAlert(user.id, signal.id, 'push_web', 'failed', 'send returned false');
        }
      }
    }

    // Update daily quota
    await db.userQuota.upsert({
      where: { userId: user.id },
      create: { userId: user.id, alertsSentToday: 1, lastResetDate: today },
      update: {
        alertsSentToday: { increment: 1 },
        lastResetDate: today,
      },
    });
  }

  return stats;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatAlertMessage(signal: SignalForAlert, tickers: string[]): string {
  const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
  const priceStr = signal.entryPrice ? ` @ $${signal.entryPrice.toFixed(2)}` : '';

  return [
    `${emoji} *${signal.action} ${tickers.join(', ')}*${priceStr}`,
    `Score: ${signal.score}/100`,
    signal.reasoning ? `\n${signal.reasoning}` : '',
    `\n_Source: ${signal.tweetText.slice(0, 100)}${signal.tweetText.length > 100 ? '...' : ''}_`,
  ]
    .filter(Boolean)
    .join('\n');
}

function isInQuietHours(
  now: Date,
  start: string | null,
  end: string | null,
  timezone: string
): boolean {
  if (!start || !end) return false;

  const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    // Same day: e.g., 22:00 to 08:00 is NOT this case
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Spans midnight: e.g., 22:00 to 08:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

async function logAlert(
  userId: string,
  signalId: string,
  channel: string,
  status: string,
  errorMsg?: string
): Promise<void> {
  const db = getDb();
  await db.alertLog.create({
    data: { userId, signalId, channel, status, errorMsg },
  });
}
