'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeatmapEntry {
  ticker: string;
  mentions: number;
  avgSentiment: number;
  avgScore: number;
  topAction: string;
  gurus: string[];
}

const TIMEFRAMES = [
  { value: 4, label: '4h' },
  { value: 12, label: '12h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
] as const;

function sentimentColor(sentiment: number): string {
  if (sentiment >= 0.6) return 'bg-emerald-500 border-emerald-400';
  if (sentiment >= 0.2) return 'bg-emerald-700 border-emerald-600';
  if (sentiment > -0.2) return 'bg-gray-700 border-gray-600';
  if (sentiment > -0.6) return 'bg-red-700 border-red-600';
  return 'bg-red-500 border-red-400';
}

function sentimentLabel(sentiment: number): string {
  if (sentiment >= 0.3) return 'Bullish';
  if (sentiment <= -0.3) return 'Bearish';
  return 'Neutral';
}

function cellSize(mentions: number, maxMentions: number): string {
  const ratio = maxMentions > 0 ? mentions / maxMentions : 0;
  if (ratio >= 0.7) return 'col-span-2 row-span-2';
  if (ratio >= 0.4) return 'col-span-2';
  return '';
}

export default function HeatmapPage() {
  const [entries, setEntries] = useState<HeatmapEntry[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HeatmapEntry | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'}/api/v1/heatmap?hours=${hours}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [hours]);

  const maxMentions = entries[0]?.mentions ?? 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">🔥 Ticker Heatmap</h1>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          See which tickers are trending across all gurus. Bigger &amp; greener = more bullish mentions.
        </p>

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
          <div className="text-center py-20 text-gray-400 animate-pulse">Scanning signals...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-gray-500">No signals in this timeframe</div>
          </div>
        ) : (
          <>
            {/* Heatmap grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 auto-rows-[80px]">
              {entries.map((entry) => (
                <button
                  key={entry.ticker}
                  onClick={() => setSelected(selected?.ticker === entry.ticker ? null : entry)}
                  className={`${sentimentColor(entry.avgSentiment)} ${cellSize(entry.mentions, maxMentions)}
                    border rounded-xl p-2 flex flex-col items-center justify-center
                    hover:brightness-125 transition-all cursor-pointer
                    ${selected?.ticker === entry.ticker ? 'ring-2 ring-white' : ''}`}
                >
                  <span className="font-bold text-sm sm:text-base leading-tight">${entry.ticker}</span>
                  <span className="text-[11px] opacity-80">{entry.mentions} mention{entry.mentions !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Bullish</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-700 inline-block" /> Neutral</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Bearish</span>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5 animate-[fadeIn_0.2s]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${selected.ticker}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selected.topAction === 'BUY' ? 'text-emerald-400 bg-emerald-400/10' :
                      selected.topAction === 'SELL' ? 'text-red-400 bg-red-400/10' :
                      'text-yellow-400 bg-yellow-400/10'
                    }`}>
                      {selected.topAction}
                    </span>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{selected.mentions}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Mentions</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      selected.avgSentiment > 0 ? 'text-emerald-400' :
                      selected.avgSentiment < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {sentimentLabel(selected.avgSentiment)}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">Sentiment</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{selected.avgScore}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Avg Score</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-2">Mentioned by</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.gurus.map((guru) => (
                      <span key={guru} className="bg-gray-800 px-3 py-1 rounded-lg text-xs text-gray-300">
                        {guru}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
