'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface WeeklyReport {
  weekStartDate: string;
  weekEndDate: string;
  signalsReceived: number;
  tradesOpened: number;
  tradesClosed: number;
  weekPnl: number;
  weekPnlPercent: number;
  bestTrade: { ticker: string; returnPercent: number } | null;
  worstTrade: { ticker: string; returnPercent: number } | null;
  guruOfTheWeek: { name: string; handle: string; accuracy: number } | null;
  topSectors: { sector: string; signalCount: number }[];
  streakStatus: { current: number; best: number };
  weekOverWeekChange: number;
}

export default function WeeklyReportPage() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.getWeeklyReport();
        setReport(res.data);
      } catch (err) {
        console.error('Failed to load weekly report:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || loading) return <Spinner />;
  if (!user) return <p className="p-8 text-center text-gray-400">Please sign in</p>;
  if (!report) return <p className="p-8 text-center text-gray-400">No report data available</p>;

  const pnlColor = report.weekPnl >= 0 ? 'text-emerald-400' : 'text-red-400';
  const wowArrow = report.weekOverWeekChange >= 0 ? '↑' : '↓';
  const wowColor = report.weekOverWeekChange >= 0 ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300';
  const dateRange = `${fmtDate(report.weekStartDate)} — ${fmtDate(report.weekEndDate)}`;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">📊 Weekly Performance</h1>
        <p className="text-sm text-gray-400">{dateRange}</p>
      </header>

      {/* Hero P&L */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
        <p className="text-sm text-gray-400 mb-1">Week P&L</p>
        <p className={`text-4xl font-bold ${pnlColor}`}>
          {report.weekPnl >= 0 ? '+' : ''}{report.weekPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
        <p className={`text-sm ${pnlColor} mt-1`}>{report.weekPnlPercent >= 0 ? '+' : ''}{report.weekPnlPercent}%</p>
        <span className={`inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full ${wowColor}`}>
          {wowArrow} {Math.abs(report.weekOverWeekChange)}% week over week
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Signals Received" value={report.signalsReceived} />
        <StatCard label="Trades Opened" value={report.tradesOpened} />
        <StatCard label="Trades Closed" value={report.tradesClosed} />
      </div>

      {/* Best / Worst trade */}
      <div className="grid grid-cols-2 gap-3">
        <TradeCard title="🏆 Best Trade" trade={report.bestTrade} good />
        <TradeCard title="📉 Worst Trade" trade={report.worstTrade} good={false} />
      </div>

      {/* Guru of the Week */}
      {report.guruOfTheWeek && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-2">🧠 Guru of the Week</h3>
          <p className="text-lg font-semibold text-white">{report.guruOfTheWeek.name}</p>
          <p className="text-sm text-gray-400">@{report.guruOfTheWeek.handle}</p>
          <p className="text-emerald-400 text-sm mt-1">{report.guruOfTheWeek.accuracy}% accuracy</p>
        </div>
      )}

      {/* Top Sectors */}
      {report.topSectors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">🏷️ Top Sectors</h3>
          <div className="flex flex-wrap gap-2">
            {report.topSectors.map((s) => (
              <span key={s.sector} className="px-3 py-1 rounded-full bg-gray-800 text-sm text-gray-300 border border-gray-700">
                {s.sector} <span className="text-gray-500">({s.signalCount})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Streak */}
      {report.streakStatus.current > 0 && (
        <div className="text-center py-3">
          <span className="inline-block px-4 py-2 rounded-full bg-amber-900/50 text-amber-300 font-medium text-sm border border-amber-700">
            🔥 {report.streakStatus.current} week win streak
            {report.streakStatus.best > report.streakStatus.current && (
              <span className="text-amber-500 ml-1">(best: {report.streakStatus.best})</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function TradeCard({ title, trade, good }: { title: string; trade: { ticker: string; returnPercent: number } | null; good: boolean }) {
  if (!trade) return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">No trades</p>
    </div>
  );
  const color = good ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-lg font-semibold text-white">{trade.ticker}</p>
      <p className={`text-sm ${color}`}>{trade.returnPercent >= 0 ? '+' : ''}{trade.returnPercent}%</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
