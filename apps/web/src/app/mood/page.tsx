'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface MarketMood {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  topBullishTickers: string[];
  topBearishTickers: string[];
  guruConsensus: { bullish: number; bearish: number; total: number };
  summary: string;
  signalVolume: 'high' | 'normal' | 'low';
  generatedAt: string;
}

export default function MoodPage() {
  const { user, loading: authLoading } = useAuth();
  const [mood, setMood] = useState<MarketMood | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getMarketMood()
      .then((res) => setMood(res.data as MarketMood))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) return <Spinner />;
  if (!user) return <div className="p-8 text-center text-gray-400">Please sign in</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;
  if (!mood) return null;

  const { overallSentiment, sentimentScore, topBullishTickers, topBearishTickers, guruConsensus, summary, signalVolume } = mood;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">🌡️ Daily Market Mood</h1>

      {/* Sentiment gauge */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
        <SentimentGauge score={sentimentScore} />
        <div className="mt-4 text-3xl font-bold">
          {overallSentiment === 'bullish' && <span className="text-emerald-400">Bullish 🟢</span>}
          {overallSentiment === 'bearish' && <span className="text-red-400">Bearish 🔴</span>}
          {overallSentiment === 'neutral' && <span className="text-gray-400">Neutral ⚪</span>}
        </div>
        <p className="text-gray-400 mt-2 text-sm">{summary}</p>
      </div>

      {/* Tickers */}
      <div className="grid grid-cols-2 gap-4">
        <TickerList label="Top Bullish" tickers={topBullishTickers} color="emerald" />
        <TickerList label="Top Bearish" tickers={topBearishTickers} color="red" />
      </div>

      {/* Guru consensus */}
      {guruConsensus.total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Guru Consensus</h2>
          <p className="text-lg font-medium">
            <span className="text-emerald-400">{guruConsensus.bullish}</span>
            {' of '}
            <span className="text-white">{guruConsensus.total}</span>
            {' gurus are bullish'}
          </p>
          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(guruConsensus.bullish / guruConsensus.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Signal volume */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-3">
        <VolumeBadge volume={signalVolume} />
      </div>
    </div>
  );
}

function SentimentGauge({ score }: { score: number }) {
  // Map -100..100 → 0..180 degrees for the arc
  const angle = ((score + 100) / 200) * 180;
  const color = score > 15 ? '#10b981' : score < -15 ? '#ef4444' : '#6b7280';

  return (
    <div className="relative mx-auto w-48 h-24 overflow-hidden">
      {/* Background arc */}
      <div className="absolute inset-0 border-[12px] border-gray-800 rounded-t-full" />
      {/* Colored arc via conic gradient */}
      <div
        className="absolute inset-0 rounded-t-full"
        style={{
          border: '12px solid transparent',
          borderBottom: 'none',
          background: `conic-gradient(from 180deg, ${color} ${angle}deg, transparent ${angle}deg) border-box`,
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-bold" style={{ color }}>
        {score > 0 ? '+' : ''}{score}
      </div>
    </div>
  );
}

function TickerList({ label, tickers, color }: { label: string; tickers: string[]; color: 'emerald' | 'red' }) {
  const pill = color === 'emerald'
    ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800'
    : 'bg-red-900/50 text-red-400 border-red-800';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">{label}</h2>
      {tickers.length === 0 ? (
        <p className="text-gray-600 text-sm">None</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tickers.map((t) => (
            <span key={t} className={`text-xs px-2.5 py-1 rounded-full border ${pill}`}>${t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function VolumeBadge({ volume }: { volume: 'high' | 'normal' | 'low' }) {
  const config = {
    high: { emoji: '🔥', text: 'High activity today', cls: 'text-orange-400' },
    normal: { emoji: '📊', text: 'Normal activity', cls: 'text-gray-300' },
    low: { emoji: '🌙', text: 'Low activity today', cls: 'text-blue-400' },
  };
  const { emoji, text, cls } = config[volume];
  return (
    <>
      <span className="text-2xl">{emoji}</span>
      <span className={`font-medium ${cls}`}>{text}</span>
    </>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
    </div>
  );
}
