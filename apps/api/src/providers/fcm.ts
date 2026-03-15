import admin from 'firebase-admin';

/**
 * Send a push notification via Firebase Cloud Messaging.
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string | null> {
  try {
    const messageId = await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'firasa-signals' },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return messageId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`FCM send failed for token ${token.slice(0, 20)}...: ${msg}`);
    return null;
  }
}

/**
 * Send push notification to multiple device tokens.
 * Returns count of successful sends.
 */
export async function sendPushToMultiple(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  if (tokens.length === 0) return 0;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });

  return response.successCount;
}
