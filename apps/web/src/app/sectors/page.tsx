'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SectorBreakdown {
  sector: string;
  signalCount: number;
  bullishCount: number;
  bearishCount: number;
  avgScore: number;
  topTickers: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

const TIMEFRAMES = [
  { value: 12, label: '12h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
] as const;

const SECTOR_EMOJI: Record<string, string> = {
  Technology: '💻', Healthcare: '🏥', Energy: '⚡', Finance: '🏦',
  Consumer: '🛒', Automotive: '🚗', Telecom: '📡', Industrials: '🏭',
  Entertainment: '🎬', 'Real Estate': '🏠', Other: '📦',
};

const SENTIMENT_STYLE: Record<string, string> = {
  bullish: 'text-emerald-400',
  bearish: 'text-red-400',
  neutral: 'text-gray-400',
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorBreakdown[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    fetch(`${API}/api/v1/sectors?hours=${hours}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => { setSectors(data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [hours]);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">📊 Sector Analysis</h1>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">Signals grouped by market sector</p>

        {/* Timeframe selector */}
        <div className="flex gap-2 mb-6">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setHours(tf.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                hours === tf.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 animate-pulse">Analyzing sectors...</div>
        ) : sectors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-gray-500">No signals in this timeframe</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((s) => {
              const total = s.bullishCount + s.bearishCount || 1;
              const bullPct = Math.round((s.bullishCount / total) * 100);
              const emoji = SECTOR_EMOJI[s.sector] ?? '📦';
              return (
                <Link
                  key={s.sector}
                  href={`/dashboard?tickers=${s.topTickers.join(',')}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition block"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold">{emoji} {s.sector}</span>
                    <span className={`text-sm font-semibold capitalize ${SENTIMENT_STYLE[s.sentiment]}`}>
                      {s.sentiment}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>{s.signalCount} signal{s.signalCount !== 1 ? 's' : ''}</span>
                    <span>Avg score: {s.avgScore}</span>
                  </div>

                  {/* Sentiment bar */}
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden flex mb-3">
                    {s.bullishCount > 0 && (
                      <div className="bg-emerald-500 h-full" style={{ width: `${bullPct}%` }} />
                    )}
                    {s.bearishCount > 0 && (
                      <div className="bg-red-500 h-full" style={{ width: `${100 - bullPct}%` }} />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-3">
                    <span>🟢 {s.bullishCount} bullish</span>
                    <span>{s.bearishCount} bearish 🔴</span>
                  </div>

                  {/* Top tickers */}
                  <div className="flex flex-wrap gap-1.5">
                    {s.topTickers.slice(0, 3).map((t) => (
                      <span key={t} className="bg-gray-800 px-2.5 py-1 rounded-full text-xs text-gray-300">
                        ${t}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
