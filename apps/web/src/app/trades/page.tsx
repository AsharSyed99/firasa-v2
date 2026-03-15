'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TradeOutcomeDto } from '@firasa/shared';
import { TradeRow } from '@/components/trades/trade-row';

export default function TradesPage() {
  const { user, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<TradeOutcomeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getTrades({ limit: 50 })
      .then((res) => setTrades(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center">Please sign in</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">📊 Trade Tracker</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-left py-2 px-2">Action</th>
              <th className="text-left py-2 px-2">Guru</th>
              <th className="text-right py-2 px-2">Entry</th>
              <th className="text-right py-2 px-2">Current</th>
              <th className="text-right py-2 px-2">Change</th>
              <th className="text-center py-2 px-2">1h</th>
              <th className="text-center py-2 px-2">4h</th>
              <th className="text-center py-2 px-2">1d</th>
              <th className="text-center py-2 px-2">1w</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <TradeRow key={trade.signal.id} trade={trade} />
            ))}
          </tbody>
        </table>
      </div>

      {trades.length === 0 && (
        <p className="text-gray-500 text-center py-8">No trades to track yet</p>
      )}
    </div>
  );
}
