import { getEnv } from '../config/env.js';

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: unknown;
}

/**
 * Send a message via the Telegram Bot API.
 * Returns the API response or null if the bot token is not configured.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<TelegramResponse | null> {
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not configured — skipping Telegram message');
    return null;
  }

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }

  return (await res.json()) as TelegramResponse;
}

/** Emoji map for signal actions */
const ACTION_EMOJI: Record<string, string> = {
  BUY: '🟢 BUY',
  SELL: '🔴 SELL',
  HOLD: '🟡 HOLD',
  WATCH: '👀 WATCH',
};

const SENTIMENT_EMOJI: Record<string, string> = {
  BULLISH: '📈 Bullish',
  BEARISH: '📉 Bearish',
  NEUTRAL: '➡️ Neutral',
};

/**
 * Format a trading signal for Telegram with HTML markup.
 */
export function formatSignalMessage(signal: {
  guruHandle: string;
  guruName: string;
  tickers: string[];
  action: string;
  sentiment: string;
  confidence: number;
  score: number;
  reasoning: string | null;
  tweetText: string;
}): string {
  const action = ACTION_EMOJI[signal.action] ?? signal.action;
  const sentiment = SENTIMENT_EMOJI[signal.sentiment] ?? signal.sentiment;
  const tickers = signal.tickers.map((t) => `<b>$${t}</b>`).join(', ');
  const confidence = Math.round(signal.confidence * 100);

  const lines = [
    `🚨 <b>New Signal</b>`,
    ``,
    `${action} — ${tickers}`,
    `Guru: <b>${signal.guruName}</b> (@${signal.guruHandle})`,
    `Sentiment: ${sentiment}`,
    `Confidence: ${confidence}% | Score: ${signal.score}`,
  ];

  if (signal.reasoning) {
    const short = signal.reasoning.length > 120
      ? signal.reasoning.slice(0, 117) + '...'
      : signal.reasoning;
    lines.push(``, `💬 <i>${short}</i>`);
  }

  return lines.join('\n');
}
