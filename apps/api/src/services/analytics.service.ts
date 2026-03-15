interface AnalyticsEvent {
  event: string;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

// In-memory buffer for batching (flushes periodically or at threshold)
const eventBuffer: AnalyticsEvent[] = [];
const FLUSH_THRESHOLD = 50;
const FLUSH_INTERVAL_MS = 30_000;

let flushTimer: NodeJS.Timeout | null = null;

export function trackEvent(event: string, userId?: string, properties?: Record<string, unknown>): void {
  eventBuffer.push({
    event,
    userId,
    properties: { ...properties, serverTimestamp: new Date().toISOString() },
    timestamp: new Date(),
  });

  if (eventBuffer.length >= FLUSH_THRESHOLD) {
    flush();
  }

  // Start periodic flush if not already running
  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  }
}

async function flush(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const batch = eventBuffer.splice(0, eventBuffer.length);
  const posthogKey = process.env.POSTHOG_API_KEY;

  if (!posthogKey) {
    console.log(`[ANALYTICS] ${batch.length} events buffered (PostHog not configured)`);
    return;
  }

  try {
    const response = await fetch('https://app.posthog.com/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: posthogKey,
        batch: batch.map((e) => ({
          type: 'capture',
          event: e.event,
          distinct_id: e.userId ?? 'anonymous',
          properties: e.properties,
          timestamp: e.timestamp?.toISOString(),
        })),
      }),
    });

    if (!response.ok) {
      console.warn(`[ANALYTICS] PostHog batch failed: ${response.status}`);
    }
  } catch (err) {
    console.warn(`[ANALYTICS] PostHog send failed:`, err);
    // Re-add failed events to buffer (up to a cap)
    if (eventBuffer.length < 500) {
      eventBuffer.push(...batch);
    }
  }
}

// Common event helpers
export const analytics = {
  userSignedUp: (userId: string, method: string) =>
    trackEvent('user_signed_up', userId, { method }),

  userSignedIn: (userId: string) =>
    trackEvent('user_signed_in', userId),

  guruFollowed: (userId: string, guruId: string) =>
    trackEvent('guru_followed', userId, { guruId }),

  guruUnfollowed: (userId: string, guruId: string) =>
    trackEvent('guru_unfollowed', userId, { guruId }),

  signalViewed: (userId: string, signalId: string) =>
    trackEvent('signal_viewed', userId, { signalId }),

  tradeTrackerViewed: (userId: string) =>
    trackEvent('trade_tracker_viewed', userId),

  tierUpgraded: (userId: string, fromTier: string, toTier: string) =>
    trackEvent('tier_upgraded', userId, { fromTier, toTier }),

  tierDowngraded: (userId: string, fromTier: string, toTier: string) =>
    trackEvent('tier_downgraded', userId, { fromTier, toTier }),

  alertSent: (userId: string, channel: string, guruId: string) =>
    trackEvent('alert_sent', userId, { channel, guruId }),

  onboardingCompleted: (userId: string, gurusSelected: number) =>
    trackEvent('onboarding_completed', userId, { gurusSelected }),

  pipelineRun: (guruId: string, signalsCreated: number) =>
    trackEvent('pipeline_run', undefined, { guruId, signalsCreated }),

  apiError: (userId: string | undefined, path: string, statusCode: number) =>
    trackEvent('api_error', userId, { path, statusCode }),

  rateLimited: (userId: string | undefined, path: string) =>
    trackEvent('rate_limited', userId, { path }),
};

export function shutdownAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
}
