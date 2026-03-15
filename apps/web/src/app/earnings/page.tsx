'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface EarningsEntry {
  ticker: string;
  earningsDate: string;
  daysUntil: number;
  hour: string;
  hasRecentSignal: boolean;
  recentSignalAction: string | null;
  recentSignalScore: number | null;
  nearEarningsWarning: boolean;
}

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEarnings(days);
      setEntries(res.data);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (user) fetchEarnings();
  }, [user, fetchEarnings]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center text-gray-400">Please sign in</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">📅 Earnings Calendar</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                     text-white focus:outline-none focus:border-blue-500 w-fit"
        >
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No upcoming earnings for tickers with recent signals.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-left py-2 px-2">Earnings Date</th>
                <th className="text-center py-2 px-2">Countdown</th>
                <th className="text-center py-2 px-2">Session</th>
                <th className="text-center py-2 px-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <EarningsRow key={`${entry.ticker}-${entry.earningsDate}`} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-gray-600 text-xs mt-4 text-center">
        Showing earnings for tickers with recent guru signals • {entries.length} result
        {entries.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function EarningsRow({ entry }: { entry: EarningsEntry }) {
  const countdownText =
    entry.daysUntil === 0
      ? 'Today'
      : entry.daysUntil === 1
        ? 'Tomorrow'
        : `${entry.daysUntil} days`;

  const countdownColor =
    entry.daysUntil <= 1
      ? 'text-yellow-400 font-semibold'
      : entry.daysUntil <= 3
        ? 'text-orange-400'
        : 'text-gray-300';

  const sessionBadge =
    entry.hour === 'BMO' ? (
      <span className="bg-sky-500/20 text-sky-400 rounded-full px-2 py-0.5 text-xs font-medium">
        🌅 BMO
      </span>
    ) : entry.hour === 'AMC' ? (
      <span className="bg-purple-500/20 text-purple-400 rounded-full px-2 py-0.5 text-xs font-medium">
        🌙 AMC
      </span>
    ) : (
      <span className="bg-gray-700/50 text-gray-400 rounded-full px-2 py-0.5 text-xs font-medium">
        {entry.hour}
      </span>
    );

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-900/50">
      <td className="py-3 px-2 font-semibold">
        <span className="text-white">{entry.ticker}</span>
        {entry.nearEarningsWarning && (
          <span className="ml-1.5" title="Signal near earnings — higher risk">
            ⚠️
          </span>
        )}
      </td>
      <td className="py-3 px-2 text-gray-300 font-mono text-xs">
        {formatDate(entry.earningsDate)}
      </td>
      <td className={`py-3 px-2 text-center ${countdownColor}`}>{countdownText}</td>
      <td className="py-3 px-2 text-center">{sessionBadge}</td>
      <td className="py-3 px-2 text-center">
        {entry.hasRecentSignal ? (
          <SignalBadge action={entry.recentSignalAction!} score={entry.recentSignalScore!} />
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
    </tr>
  );
}

function SignalBadge({ action, score }: { action: string; score: number }) {
  const isBuy = action === 'BUY';
  const bg = isBuy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>
      {isBuy ? '🟢' : '🔴'} {action} · {score.toFixed(1)}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
