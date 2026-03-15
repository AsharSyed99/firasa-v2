'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

interface TradeLogEntry {
  date: string;
  ticker: string;
  action: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  finalCapital: number;
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  tradeLog: TradeLogEntry[];
  equityCurve: { date: string; value: number }[];
}

export default function BacktestPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [capital, setCapital] = useState('10000');
  const [positionSize, setPositionSize] = useState('10');
  const [guruInput, setGuruInput] = useState('');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runBacktest = async () => {
    setLoading(true);
    setError('');
    try {
      const guruIds = guruInput.trim() ? guruInput.split(',').map((s) => s.trim()) : undefined;
      const res = await api.postBacktest({
        guruIds,
        startDate,
        endDate,
        initialCapital: Number(capital),
        positionSize: Number(positionSize),
      });
      setResult(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const maxEquity = result ? Math.max(...result.equityCurve.map((p) => p.value)) : 0;
  const minEquity = result ? Math.min(...result.equityCurve.map((p) => p.value)) : 0;

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Sign in to access Signal Replay & Backtest (Pro feature)</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      <h1 className="text-2xl font-bold">📊 Signal Replay / Backtest</h1>

      {/* Config Form */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-4 border border-gray-800">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-400">Start Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-white" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-400">End Date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-white" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-400">Initial Capital ($)</span>
            <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-white" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-400">Position Size (%)</span>
            <input type="number" value={positionSize} onChange={(e) => setPositionSize(e.target.value)}
              min="1" max="100"
              className="w-full mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-white" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-gray-400">Guru IDs (comma-separated, blank = all)</span>
          <input type="text" value={guruInput} onChange={(e) => setGuruInput(e.target.value)}
            placeholder="guru-id-1, guru-id-2"
            className="w-full mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-white" />
        </label>
        <button onClick={runBacktest} disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg font-medium transition-colors">
          {loading ? 'Running…' : 'Run Backtest'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Return" value={`${result.returnPercent > 0 ? '+' : ''}${result.returnPercent}%`}
              positive={result.returnPercent >= 0} />
            <StatCard label="Win Rate"
              value={result.totalTrades > 0 ? `${Math.round((result.wins / result.totalTrades) * 100)}%` : '0%'}
              positive={result.wins > result.losses} />
            <StatCard label="Max Drawdown" value={`-${result.maxDrawdown}%`} positive={false} />
            <StatCard label="Sharpe Ratio" value={String(result.sharpeRatio)} positive={result.sharpeRatio > 0} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <MiniStat label="Trades" value={result.totalTrades} />
            <MiniStat label="Wins" value={result.wins} />
            <MiniStat label="Losses" value={result.losses} />
          </div>

          {/* Equity Curve (CSS bar chart) */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h2 className="text-lg font-semibold mb-3">Equity Curve</h2>
            <div className="flex items-end gap-[2px] h-40 overflow-x-auto">
              {result.equityCurve.map((pt, i) => {
                const range = maxEquity - minEquity || 1;
                const height = ((pt.value - minEquity) / range) * 100;
                const isGain = pt.value >= Number(capital);
                return (
                  <div key={i} className="flex-1 min-w-[3px] relative group">
                    <div
                      className={`w-full rounded-t ${isGain ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block
                      bg-gray-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {pt.date}: ${pt.value.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade Log */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Trade Log</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Ticker</th>
                  <th className="text-right py-2">Entry</th>
                  <th className="text-right py-2">Exit</th>
                  <th className="text-right py-2">Return</th>
                </tr>
              </thead>
              <tbody>
                {result.tradeLog.map((t, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-1.5">{t.date}</td>
                    <td className="font-mono">{t.ticker}</td>
                    <td className="text-right">${t.entryPrice.toFixed(2)}</td>
                    <td className="text-right">${t.exitPrice.toFixed(2)}</td>
                    <td className={`text-right font-medium ${t.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.returnPct > 0 ? '+' : ''}{t.returnPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.tradeLog.length === 0 && (
              <p className="text-gray-500 text-center py-4">No trades in this period</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
