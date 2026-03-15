'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import Link from 'next/link';

interface GuruOption { id: string; displayName: string; twitterHandle: string }

interface GuruStats {
  guruId: string; displayName: string; twitterHandle: string;
  winRate: number; avgScore: number; totalSignals: number; streak: number;
  topTickers: { ticker: string; count: number }[];
  actionBreakdown: { BUY: number; SELL: number; HOLD: number };
}

interface ComparisonData {
  guru1: GuruStats; guru2: GuruStats;
  sharedTickers: string[]; agreementRate: number;
  agreements: { ticker: string; action: string }[];
  disagreements: { ticker: string; action1: string; action2: string }[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';
const ACTION_CLR: Record<string, string> = {
  BUY: 'text-emerald-400', SELL: 'text-red-400', HOLD: 'text-yellow-400',
};

function Bar({ v1, v2, label }: { v1: number; v2: number; label: string }) {
  const max = Math.max(v1, v2, 1);
  const w1 = (v1 / max) * 100;
  const w2 = (v2 / max) * 100;
  const better = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
  return (
    <div className="mb-4">
      <div className="text-xs text-gray-400 mb-1 text-center">{label}</div>
      <div className="flex items-center gap-3">
        <span className={`w-16 text-right text-sm font-bold ${better === 1 ? 'text-emerald-400' : 'text-gray-300'}`}>
          {v1}
        </span>
        <div className="flex-1 flex gap-1 items-center">
          <div className="flex-1 flex justify-end">
            <div className={`h-5 rounded-l transition-all ${better === 1 ? 'bg-emerald-500' : 'bg-gray-600'}`}
              style={{ width: `${w1}%` }} />
          </div>
          <div className="flex-1">
            <div className={`h-5 rounded-r transition-all ${better === 2 ? 'bg-emerald-500' : 'bg-gray-600'}`}
              style={{ width: `${w2}%` }} />
          </div>
        </div>
        <span className={`w-16 text-sm font-bold ${better === 2 ? 'text-emerald-400' : 'text-gray-300'}`}>
          {v2}
        </span>
      </div>
    </div>
  );
}

export default function ComparePage() {
  useAuth();
  const [gurus, setGurus] = useState<GuruOption[]>([]);
  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/gurus`, {
      headers: { Authorization: `Bearer ${(window as any).__firasaToken}` },
    })
      .then((r) => r.json())
      .then((res) => setGurus(res.data ?? []))
      .catch(() => {});
  }, []);

  const compare = () => {
    if (!g1 || !g2 || g1 === g2) return;
    setLoading(true);
    fetch(`${API}/api/v1/compare?guru1=${g1}&guru2=${g2}&days=${days}`, {
      headers: { Authorization: `Bearer ${(window as any).__firasaToken}` },
    })
      .then((r) => r.json())
      .then((res) => { setData(res.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const s1 = data?.guru1;
  const s2 = data?.guru2;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">⚔️ Head-to-Head</h1>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>

        {/* Selector row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <select value={g1} onChange={(e) => setG1(e.target.value)}
            className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Guru 1</option>
            {gurus.map((g) => <option key={g.id} value={g.id}>@{g.twitterHandle}</option>)}
          </select>
          <span className="bg-orange-500 text-white text-xs font-extrabold px-3 py-1 rounded-full shrink-0">VS</span>
          <select value={g2} onChange={(e) => setG2(e.target.value)}
            className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Guru 2</option>
            {gurus.map((g) => <option key={g.id} value={g.id}>@{g.twitterHandle}</option>)}
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value={7}>7d</option><option value={30}>30d</option><option value={90}>90d</option>
          </select>
          <button onClick={compare} disabled={!g1 || !g2 || g1 === g2 || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2 rounded-lg text-sm font-medium shrink-0 transition">
            Compare
          </button>
        </div>

        {loading && <div className="text-center py-20 text-gray-400 animate-pulse">Crunching numbers...</div>}

        {s1 && s2 && !loading && (
          <>
            {/* Names header */}
            <div className="flex justify-between mb-4">
              <div className="text-center flex-1"><span className="font-bold">@{s1.twitterHandle}</span></div>
              <div className="w-16" />
              <div className="text-center flex-1"><span className="font-bold">@{s2.twitterHandle}</span></div>
            </div>

            {/* Bar comparisons */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
              <Bar v1={s1.winRate} v2={s2.winRate} label="Win Rate %" />
              <Bar v1={s1.avgScore} v2={s2.avgScore} label="Avg Score" />
              <Bar v1={s1.totalSignals} v2={s2.totalSignals} label="Total Signals" />
              <Bar v1={s1.streak} v2={s2.streak} label="🔥 Streak" />
            </div>

            {/* Action breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[s1, s2].map((s) => (
                <div key={s.guruId} className={`bg-gray-900 border rounded-xl p-4 ${
                  s.winRate > (s === s1 ? s2 : s1).winRate ? 'border-emerald-500/50' : 'border-gray-800'
                }`}>
                  <div className="text-xs text-gray-400 mb-2">Signal Breakdown</div>
                  {(['BUY', 'SELL', 'HOLD'] as const).map((a) => (
                    <div key={a} className="flex justify-between text-sm mb-1">
                      <span className={ACTION_CLR[a]}>{a}</span>
                      <span>{s.actionBreakdown[a]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Shared tickers */}
            {data!.sharedTickers.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Shared Tickers</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                    {data!.agreementRate}% agree
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.agreements.map((a) => (
                    <span key={a.ticker} className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs">
                      ${a.ticker} — {a.action} ✓
                    </span>
                  ))}
                  {data!.disagreements.map((d) => (
                    <span key={d.ticker} className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs">
                      ${d.ticker} — {d.action1} vs {d.action2}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!data && !loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">⚔️</div>
            <div>Select two gurus to compare their performance</div>
          </div>
        )}
      </div>
    </div>
  );
}
