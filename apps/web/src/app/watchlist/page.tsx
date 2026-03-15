'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface WatchlistItem {
  id: string;
  ticker: string;
  addedAt: string;
  notes: string | null;
  currentPrice: number | null;
  dailyChangePercent: number | null;
  recentSignalCount: number;
}

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await api.getWatchlist();
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user, fetchWatchlist]);

  const handleAdd = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setAdding(true);
    setError(null);
    try {
      await api.addToWatchlist(t, notes || undefined);
      setTicker('');
      setNotes('');
      await fetchWatchlist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add ticker');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (t: string) => {
    try {
      await api.removeFromWatchlist(t);
      setItems((prev) => prev.filter((i) => i.ticker !== t));
    } catch (err) {
      console.error('Failed to remove', err);
    }
  };

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
      <h1 className="text-2xl font-bold mb-6">👁️ Watchlist</h1>

      {/* Add ticker form */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="AAPL, TSLA, NVDA…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="sm:w-48 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !ticker.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                     rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          {adding ? 'Adding…' : '+ Add'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Watchlist table */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Your watchlist is empty. Add tickers above to track prices and signals.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-right py-2 px-2">Change</th>
                <th className="text-center py-2 px-2">Signals (7d)</th>
                <th className="text-left py-2 px-2 hidden sm:table-cell">Notes</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  onRemove={() => handleRemove(item.ticker)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-gray-600 text-xs mt-4 text-center">
        {items.length} item{items.length !== 1 ? 's' : ''} in watchlist
      </p>
    </div>
  );
}

function WatchlistRow({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: () => void;
}) {
  const changeColor =
    item.dailyChangePercent === null
      ? 'text-gray-500'
      : item.dailyChangePercent >= 0
        ? 'text-green-400'
        : 'text-red-400';

  const pct = item.dailyChangePercent;
  const changeStr = pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—';

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-900/50 group">
      <td className="py-3 px-2 font-semibold">
        <Link href={`/dashboard?ticker=${item.ticker}`} className="text-blue-400 hover:text-blue-300 hover:underline">
          {item.ticker}
        </Link>
      </td>
      <td className="py-3 px-2 text-right font-mono">
        {item.currentPrice !== null ? `$${item.currentPrice.toFixed(2)}` : '—'}
      </td>
      <td className={`py-3 px-2 text-right font-mono ${changeColor}`}>{changeStr}</td>
      <td className="py-3 px-2 text-center">
        {item.recentSignalCount > 0 ? (
          <Link href={`/dashboard?ticker=${item.ticker}`}
            className="inline-block bg-blue-500/20 text-blue-400 rounded-full px-2 py-0.5 text-xs font-medium hover:bg-blue-500/30">
            {item.recentSignalCount}
          </Link>
        ) : (
          <span className="text-gray-600">0</span>
        )}
      </td>
      <td className="py-3 px-2 text-gray-500 text-xs truncate max-w-[160px] hidden sm:table-cell">{item.notes || '—'}</td>
      <td className="py-3 px-2 text-right">
        <button onClick={onRemove} title="Remove from watchlist"
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity text-lg leading-none">
          ✕
        </button>
      </td>
    </tr>
  );
}
