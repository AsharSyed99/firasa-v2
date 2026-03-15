'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  guruId: string;
  displayName: string;
  twitterHandle: string;
  category: string;
  totalSignals: number;
  profitableSignals: number;
  winRate: number;
  avgScore: number;
  streak: number;
  followerCount: number;
  rank: number;
}

const TIMEFRAMES = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
] as const;

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'}/api/v1/leaderboard?timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🏆 Guru Leaderboard</h1>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>

        {/* Timeframe tabs */}
        <div className="flex gap-2 mb-6">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeframe === tf.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 animate-pulse">Loading rankings...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No data for this timeframe yet</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.guruId}
                className={`bg-gray-900 rounded-xl p-4 flex items-center gap-4 border ${
                  entry.rank <= 3 ? 'border-emerald-500/30' : 'border-gray-800'
                }`}
              >
                <div className="text-2xl w-10 text-center">
                  {entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : (
                    <span className="text-gray-500 text-lg">#{entry.rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{entry.displayName}</div>
                  <div className="text-sm text-gray-400">@{entry.twitterHandle}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-emerald-400 font-bold">{entry.winRate}%</div>
                  <div className="text-xs text-gray-500">{entry.totalSignals} signals</div>
                </div>
                <div className="text-right space-y-1 hidden sm:block">
                  <div className="text-sm">Score: {entry.avgScore}</div>
                  {entry.streak > 2 && (
                    <div className="text-xs text-orange-400">🔥 {entry.streak} streak</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
