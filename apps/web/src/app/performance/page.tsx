'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { PerformanceDto } from '@/lib/api';

function fmt(n: number): string {
  return n >= 0 ? `+$${n.toLocaleString()}` : `-$${Math.abs(n).toLocaleString()}`;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function TradeCard({ label, trade, color }: { label: string; trade: { ticker: string; returnPercent: number } | null; color: string }) {
  if (!trade) return null;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-bold">{trade.ticker}</span>
        <span className={`text-sm font-mono ${color}`}>{pct(trade.returnPercent)}</span>
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: { month: string; return: number }[] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.return)), 1);
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Monthly P&L</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => {
          const height = Math.max((Math.abs(d.return) / maxAbs) * 100, 4);
          const isPos = d.return >= 0;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-xs text-gray-400 mb-1">{fmt(d.return)}</div>
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t ${isPos ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{d.month.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuruTable({ data }: { data: PerformanceDto['roiByGuru'] }) {
  if (data.length === 0) return <p className="text-sm text-gray-500">No guru-linked trades yet.</p>;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
            <th className="text-left p-3">Guru</th>
            <th className="text-right p-3">Trades</th>
            <th className="text-right p-3">Win Rate</th>
            <th className="text-right p-3">Avg Return</th>
          </tr>
        </thead>
        <tbody>
          {data.map((g) => (
            <tr key={g.guruHandle} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="p-3">
                <div className="font-medium">{g.guruName}</div>
                <div className="text-xs text-gray-500">@{g.guruHandle}</div>
              </td>
              <td className="text-right p-3 font-mono">{g.trades}</td>
              <td className="text-right p-3 font-mono">{g.winRate}%</td>
              <td className={`text-right p-3 font-mono ${g.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pct(g.avgReturn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PerformancePage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PerformanceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    api
      .getPerformance()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-400 text-center">{error}</div>;
  }

  if (!data) return null;

  const pnlColor = data.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">My Performance</h1>

      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total P&L</div>
          <div className={`text-3xl font-bold mt-1 ${pnlColor}`}>{fmt(data.totalPnl)}</div>
        </div>
        <StatCard label="Win Rate" value={`${data.winRate}%`} />
        <StatCard label="Total Trades" value={String(data.totalTrades)} sub={`${data.openPositions} open · ${data.closedPositions} closed`} />
        <StatCard label="Avg Return" value={pct(data.avgReturn)} />
      </div>

      {/* Best / Worst trades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TradeCard label="Best Trade" trade={data.bestTrade} color="text-emerald-400" />
        <TradeCard label="Worst Trade" trade={data.worstTrade} color="text-red-400" />
      </div>

      {/* Monthly chart */}
      <MonthlyChart data={data.monthlyReturns} />

      {/* ROI by Guru */}
      <div>
        <h2 className="text-lg font-semibold mb-2">ROI by Guru</h2>
        <GuruTable data={data.roiByGuru} />
      </div>
    </div>
  );
}
