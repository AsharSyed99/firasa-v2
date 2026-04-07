'use client';

import { useState } from 'react';
import { api, type SmartMoneyDto } from '../../lib/api';
import { useAuth } from '../../hooks/use-auth';
import ConfirmationCard from './confirmation-card';
import TradesTable from './trades-table';

export default function SmartMoneyPage() {
  const { user, loading: authLoading } = useAuth();
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<SmartMoneyDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSmartMoney(t);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Sign In Required</h1>
          <p className="text-gray-400">Smart Money analysis requires a Pro or Premium account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">🏦 Smart Money</h1>
      <p className="text-sm text-gray-400 mb-6">
        Cross-reference guru signals with institutional options flow, dark pools, and insider trades.
      </p>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter ticker (e.g., AAPL)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !ticker.trim()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <ConfirmationCard data={data} />

          {/* Options Flow */}
          {data.optionsFlow && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-100 mb-3">📊 Options Flow</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bullish Volume</p>
                  <p className="text-lg font-bold text-green-400">
                    {data.optionsFlow.bullishVolume.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bearish Volume</p>
                  <p className="text-lg font-bold text-red-400">
                    {data.optionsFlow.bearishVolume.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Net Sentiment</p>
                  <p className={`text-lg font-bold ${
                    data.optionsFlow.netSentiment === 'BULLISH' ? 'text-green-400' :
                    data.optionsFlow.netSentiment === 'BEARISH' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {data.optionsFlow.netSentiment}
                  </p>
                </div>
              </div>
              {data.optionsFlow.unusualActivity && (
                <div className="mt-3 text-center">
                  <span className="text-xs bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full">
                    ⚡ Unusual Activity Detected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dark Pool */}
          {data.darkPool && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-100 mb-3">🌑 Dark Pool Activity</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Volume</p>
                  <p className="text-lg font-bold text-gray-100">
                    {data.darkPool.totalVolume.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Large Blocks</p>
                  <p className="text-lg font-bold text-purple-400">{data.darkPool.largeBlockCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Net Direction</p>
                  <p className={`text-lg font-bold ${
                    data.darkPool.netDirection === 'BUY' ? 'text-green-400' :
                    data.darkPool.netDirection === 'SELL' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {data.darkPool.netDirection}
                  </p>
                </div>
              </div>
            </div>
          )}

          <TradesTable
            title="🏛️ Congressional Trades"
            trades={data.congressTrades?.recentTrades}
            columns={['politician', 'action', 'amount', 'date']}
          />

          <TradesTable
            title="👔 Insider Trades"
            trades={data.insiderTrades?.recentTrades}
            columns={['name', 'title', 'action', 'date']}
          />
        </div>
      )}
    </div>
  );
}
