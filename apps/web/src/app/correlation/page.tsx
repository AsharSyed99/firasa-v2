'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GuruInfo { id: string; handle: string; name: string }
interface Correlation {
  guru1: GuruInfo;
  guru2: GuruInfo;
  sharedTickers: number;
  agreements: number;
  disagreements: number;
  correlation: number;
}

const DAY_OPTIONS = [7, 30, 90] as const;

function CorrelationBar({ value }: { value: number }) {
  // value: -1 (red/disagree) to 1 (green/agree)
  const pct = Math.round(((value + 1) / 2) * 100);
  const color = value > 0.3 ? 'bg-emerald-500' : value < -0.3 ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div className="w-full h-3 bg-zinc-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Badge({ correlation }: { correlation: number }) {
  if (correlation >= 0.6) return <span className="text-xs text-emerald-400">🤝 Strong agreement</span>;
  if (correlation <= -0.6) return <span className="text-xs text-red-400">⚔️ Strong disagreement</span>;
  return null;
}

function PairCard({ pair }: { pair: Correlation }) {
  const total = pair.agreements + pair.disagreements;
  const agreePct = total > 0 ? Math.round((pair.agreements / total) * 100) : 0;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-zinc-100">{pair.guru1.name}</span>
          <span className="text-zinc-500">↔</span>
          <span className="text-zinc-100">{pair.guru2.name}</span>
        </div>
        <Badge correlation={pair.correlation} />
      </div>

      <CorrelationBar value={pair.correlation} />

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>🔴 Disagree</span>
        <span className="font-mono text-zinc-200">{pair.correlation > 0 ? '+' : ''}{pair.correlation.toFixed(2)}</span>
        <span>🟢 Agree</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-zinc-900 rounded-lg p-2">
          <div className="text-zinc-400">Shared</div>
          <div className="text-zinc-100 font-bold text-base">{pair.sharedTickers}</div>
          <div className="text-zinc-500">tickers</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-2">
          <div className="text-zinc-400">Agree</div>
          <div className="text-emerald-400 font-bold text-base">{pair.agreements}</div>
          <div className="text-zinc-500">{agreePct}%</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-2">
          <div className="text-zinc-400">Disagree</div>
          <div className="text-red-400 font-bold text-base">{pair.disagreements}</div>
          <div className="text-zinc-500">{100 - agreePct}%</div>
        </div>
      </div>
    </div>
  );
}

export default function CorrelationPage() {
  const { user, loading: authLoading } = useAuth();
  const [pairs, setPairs] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getCorrelations(days)
      .then((res) => setPairs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, days]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center text-zinc-400">Please sign in</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">🗺️ Guru Correlation Map</h1>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Shows which gurus tend to agree or disagree on the same tickers over the last {days} days.
        Only pairs with 2+ shared tickers are shown.
      </p>

      <div className="space-y-4">
        {pairs.map((pair, i) => (
          <PairCard key={`${pair.guru1.id}-${pair.guru2.id}-${i}`} pair={pair} />
        ))}
      </div>

      {pairs.length === 0 && (
        <p className="text-zinc-500 text-center py-8">
          No guru pairs with enough shared tickers in the last {days} days.
        </p>
      )}
    </div>
  );
}
