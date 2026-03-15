import { Router } from 'express';
import { getDb } from '../../services/database.js';

export const shareRouter = Router();

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BUY: { bg: '#14532d', text: '#86efac', border: '#15803d' },
  SELL: { bg: '#7f1d1d', text: '#fca5a5', border: '#b91c1c' },
  HOLD: { bg: '#713f12', text: '#fde047', border: '#a16207' },
  UNCLEAR: { bg: '#1f2937', text: '#9ca3af', border: '#4b5563' },
};

const ACTION_EMOJI: Record<string, string> = {
  BUY: '🟢', SELL: '🔴', HOLD: '🟡', UNCLEAR: '⚪',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** GET /api/v1/share/:signalId — Public OG-optimized HTML page */
shareRouter.get('/:signalId', async (req, res) => {
  try {
    const db = getDb();
    const signal = await db.signal.findUnique({
      where: { id: req.params.signalId },
      include: { guru: { select: { twitterHandle: true, displayName: true } } },
    });

    if (!signal) {
      res.status(404).send('<html><body><h1>Signal not found</h1></body></html>');
      return;
    }

    const tickers = JSON.parse(signal.tickers) as string[];
    const tickerStr = tickers.map((t) => `$${t}`).join(' ');
    const emoji = ACTION_EMOJI[signal.action] ?? '⚪';
    const colors = ACTION_COLORS[signal.action] ?? ACTION_COLORS.UNCLEAR;
    const safeTweet = escapeHtml(signal.tweetText);
    const safeGuru = escapeHtml(signal.guru.displayName);
    const safeHandle = escapeHtml(signal.guru.twitterHandle);

    const ogTitle = `${emoji} ${signal.action} ${tickerStr} — @${safeHandle}`;
    const ogDescription = signal.tweetText.slice(0, 200);
    const shareUrl = `https://firasa.app/s/${signal.id}`;
    const priceStr = signal.entryPrice ? `$${signal.entryPrice.toFixed(2)}` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${ogTitle} | Firasa</title>
  <meta property="og:title" content="${escapeHtml(ogTitle)}"/>
  <meta property="og:description" content="${escapeHtml(ogDescription)}"/>
  <meta property="og:url" content="${shareUrl}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="Firasa"/>
  <meta property="og:image" content="https://firasa.app/og-card.png"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}"/>
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#030712;color:#f3f4f6;font-family:system-ui,sans-serif;
         display:flex;justify-content:center;align-items:center;min-height:100vh;padding:16px}
    .card{max-width:480px;width:100%;border:1px solid ${colors.border};
          background:${colors.bg};border-radius:12px;padding:24px}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .action{font-size:20px;font-weight:700;color:${colors.text}}
    .guru{font-size:14px;opacity:.75;margin-left:8px}
    .score{font-size:12px;font-family:monospace;padding:2px 8px;border-radius:4px;
           background:#374151;color:#d1d5db}
    .tickers{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .ticker{font-size:13px;font-family:monospace;padding:2px 10px;background:#1f2937;border-radius:4px}
    .price{font-size:13px;opacity:.7}
    .tweet{font-size:14px;opacity:.8;line-height:1.5;margin-bottom:16px;
           overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}
    .footer{font-size:12px;opacity:.4;margin-bottom:16px}
    .cta{display:block;text-align:center;padding:12px;background:#2563eb;color:#fff;
         border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
    .cta:hover{background:#1d4ed8}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <span class="action">${emoji} ${signal.action}</span>
        <span class="guru">by @${safeHandle}</span>
      </div>
      <span class="score">${signal.score}</span>
    </div>
    <div class="tickers">
      ${tickers.map((t) => `<span class="ticker">$${escapeHtml(t)}</span>`).join('')}
      ${priceStr ? `<span class="price">@ ${priceStr}</span>` : ''}
    </div>
    <div class="tweet">${safeTweet}</div>
    <div class="footer">${safeGuru} · Firasa Signal</div>
    <a class="cta" href="https://firasa.app/?ref=share">Get alerts like this → Sign up free</a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(html);
  } catch {
    res.status(500).send('<html><body><h1>Something went wrong</h1></body></html>');
  }
});

/** GET /api/v1/share/:signalId/json — Public JSON endpoint for Next.js SSR */
shareRouter.get('/:signalId/json', async (req, res) => {
  try {
    const db = getDb();
    const signal = await db.signal.findUnique({
      where: { id: req.params.signalId },
      include: { guru: { select: { twitterHandle: true, displayName: true } } },
    });

    if (!signal) {
      res.status(404).json({ success: false, error: 'Signal not found' });
      return;
    }

    const tickers = JSON.parse(signal.tickers) as string[];

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: {
        id: signal.id,
        guruHandle: signal.guru.twitterHandle,
        guruName: signal.guru.displayName,
        tweetText: signal.tweetText,
        tickers,
        action: signal.action,
        score: signal.score,
        entryPrice: signal.entryPrice,
        tweetCreatedAt: signal.tweetCreatedAt.toISOString(),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
