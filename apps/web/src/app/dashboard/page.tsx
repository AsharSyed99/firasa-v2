'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SignalDto } from '@firasa/shared';
import { SignalCard } from '@/components/signals/signal-card';
import { SignalFilters } from '@/components/signals/signal-filters';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<SignalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<{ guruId?: string; action?: string }>({});

  const fetchSignals = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const res = await api.getSignals({
        ...filters,
        limit: 20,
        cursor: reset ? undefined : cursor,
      });
      if (reset) {
        setSignals(res.data);
      } else {
        setSignals((prev) => [...prev, ...res.data]);
      }
      setCursor(res.meta?.cursor ?? undefined);
      setHasMore(!!res.meta?.cursor);
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, cursor]);

  useEffect(() => {
    if (user) fetchSignals(true);
  }, [user, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <div className="p-8 text-center">Please sign in</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">📡 Signal Feed</h1>

      <SignalFilters filters={filters} onChange={(f) => { setFilters(f); setCursor(undefined); }} />

      <div className="space-y-3 mt-4">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>

      {loading && <LoadingSpinner />}

      {hasMore && !loading && (
        <button
          onClick={() => fetchSignals(false)}
          className="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        >
          Load more
        </button>
      )}

      {!loading && signals.length === 0 && (
        <p className="text-gray-500 text-center py-8">No signals yet</p>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
    </div>
  );
}
