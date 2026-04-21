import webPush from 'web-push';
import { getEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('web-push');
let initialized = false;

export function initWebPush(): void {
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    log.warn('VAPID keys not configured — web push disabled');
    return;
  }

  webPush.setVapidDetails(
    env.VAPID_SUBJECT ?? 'mailto:support@firasa.app',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  initialized = true;
  log.info('Web Push initialized with VAPID keys');
}

export interface WebPushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Send a web push notification. Returns true on success.
 * Returns 'gone' if the subscription is expired/invalid (caller should delete it).
 */
export async function sendWebPushNotification(
  sub: WebPushTarget,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<true | 'gone' | false> {
  if (!initialized) return false;

  const payload = JSON.stringify({ title, body, data });

  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      payload,
      { TTL: 60 * 60 }, // 1 hour
    );
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      log.info({ endpoint: sub.endpoint.slice(0, 50) }, 'Subscription expired, marking for deletion');
      return 'gone';
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ endpoint: sub.endpoint.slice(0, 50), err: msg }, 'Web push send failed');
    return false;
  }
}
