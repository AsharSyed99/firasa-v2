import { getEnv } from '../config/env.js';

/**
 * Send a WhatsApp message via Twilio.
 */
export async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ sid: string } | null> {
  const env = getEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    console.warn('Twilio not configured — skipping WhatsApp alert');
    return null;
  }

  const from = env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const body = new URLSearchParams({
    From: from,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: message,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { sid: string };
  return data;
}
