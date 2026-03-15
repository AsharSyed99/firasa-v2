import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

const ACTION_EMOJI: Record<string, string> = {
  BUY: '🟢', SELL: '🔴', HOLD: '🟡', UNCLEAR: '⚪',
};

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BUY: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-700' },
  SELL: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-700' },
  HOLD: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-700' },
  UNCLEAR: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-600' },
};

interface Signal {
  id: string;
  guruHandle: string;
  guruName: string;
  tweetText: string;
  tickers: string[];
  action: string;
  score: number;
  entryPrice: number | null;
  tweetCreatedAt: string;
}

async function fetchSignal(id: string): Promise<Signal | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/share/${id}/json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const signal = await fetchSignal(id);
  if (!signal) {
    return { title: 'Signal Not Found | Firasa' };
  }

  const tickers = signal.tickers.map((t) => `$${t}`).join(' ');
  const emoji = ACTION_EMOJI[signal.action] ?? '⚪';
  const title = `${emoji} ${signal.action} ${tickers} — @${signal.guruHandle}`;
  const description = signal.tweetText.slice(0, 200);

  return {
    title: `${title} | Firasa`,
    description,
    openGraph: {
      title,
      description,
      url: `https://firasa.app/s/${id}`,
      siteName: 'Firasa',
      type: 'article',
      images: ['https://firasa.app/og-card.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharedSignalPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const signal = await fetchSignal(id);

  if (!signal) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Signal Not Found</h1>
          <p className="text-gray-400 mb-6">This signal may have been removed or the link is invalid.</p>
          <a href="https://firasa.app" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500">
            Go to Firasa
          </a>
        </div>
      </div>
    );
  }

  const style = ACTION_STYLES[signal.action] ?? ACTION_STYLES.UNCLEAR;
  const emoji = ACTION_EMOJI[signal.action] ?? '⚪';
  const time = new Date(signal.tweetCreatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const scoreColor =
    signal.score >= 70 ? 'bg-green-700 text-green-100' :
    signal.score >= 40 ? 'bg-yellow-700 text-yellow-100' :
    'bg-gray-700 text-gray-300';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Signal Card */}
        <div className={`border rounded-xl p-5 ${style.bg} ${style.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <span className={`text-lg font-bold ${style.text}`}>{signal.action}</span>
              <span className="text-sm text-gray-400">by @{signal.guruHandle}</span>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${scoreColor}`}>
              {signal.score}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap mb-3">
            {signal.tickers.map((t) => (
              <span key={t} className="text-sm font-mono px-2.5 py-0.5 bg-gray-800 rounded">
                ${t}
              </span>
            ))}
            {signal.entryPrice != null && (
              <span className="text-sm text-gray-400">@ ${signal.entryPrice.toFixed(2)}</span>
            )}
          </div>

          <p className="text-sm text-gray-200 leading-relaxed mb-4">{signal.tweetText}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{signal.guruName}</span>
            <span className="text-xs text-gray-500">{time}</span>
          </div>
        </div>

        {/* CTA */}
        <a
          href="https://firasa.app/?ref=share"
          className="block w-full text-center px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-base transition-colors"
        >
          Get alerts like this → Sign up free
        </a>

        <p className="text-center text-xs text-gray-600">
          Firasa — Twitter-powered trading signals from financial gurus
        </p>
      </div>
    </div>
  );
}
