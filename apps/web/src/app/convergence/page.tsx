'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import Link from 'next/link';

interface ConvergenceAlert {
  ticker: string;
  guruCount: number;
  gurus: { handle: string; name: string; action: string; score: number }[];
  dominantAction: 'BUY' | 'SELL' | 'HOLD';
  avgScore: number;
  convergenceScore: number;
  detectedAt: string;
}

const ACTION_COLORS = {
  BUY: 'text-emerald-400 bg-emerald-400/10',
  SELL: 'text-red-400 bg-red-400/10',
  HOLD: 'text-yellow-400 bg-yellow-400/10',
};

export default function ConvergencePage() {
  useAuth(); // Ensure authenticated
  const [alerts, setAlerts] = useState<ConvergenceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010'}/api/v1/convergence`, {
      headers: { Authorization: `Bearer ${(window as any).__firasaToken}` },
    })
      .then((r) => r.json())
      .then((data) => { setAlerts(data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">🎯 Convergence Alerts</h1>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          When multiple gurus mention the same ticker, the signal is stronger.
        </p>

        {loading ? (
          <div className="text-center py-20 text-gray-400 animate-pulse">Scanning for convergence...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-gray-500">No convergence detected right now</div>
            <div className="text-xs text-gray-600 mt-2">Check back during market hours</div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.ticker} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${alert.ticker}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${ACTION_COLORS[alert.dominantAction]}`}>
                      {alert.dominantAction}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{alert.convergenceScore}</div>
                    <div className="text-[10px] text-gray-500">CONVERGENCE</div>
                  </div>
                </div>

                {/* Strength bar */}
                <div className="h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      alert.convergenceScore >= 70 ? 'bg-emerald-500' :
                      alert.convergenceScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${alert.convergenceScore}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {alert.gurus.map((g) => (
                    <div key={g.handle} className="bg-gray-800 px-3 py-1.5 rounded-lg text-xs">
                      <span className="text-gray-400">@{g.handle}</span>
                      <span className={`ml-2 ${g.action === 'BUY' ? 'text-emerald-400' : g.action === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {g.action}
                      </span>
                      <span className="ml-1 text-gray-500">({g.score})</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{alert.guruCount} gurus agree</span>
                  <span>Avg score: {alert.avgScore}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
