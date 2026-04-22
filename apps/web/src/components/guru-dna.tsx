'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GuruDna {
  bullishRatio: number;
  bearishRatio: number;
  avgConfidence: number;
  topTickers: string[];
  preferredTimeframe: string;
  traits: { label: string; value: number }[];
}

interface GuruDnaCardProps {
  guruId: string;
}

export function GuruDnaCard({ guruId }: GuruDnaCardProps) {
  const [dna, setDna] = useState<GuruDna | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: GuruDna }>(`/api/v1/gurus/${guruId}/dna`)
      .then((res) => setDna(res.data))
      .catch(() => setDna(null))
      .finally(() => setLoading(false));
  }, [guruId]);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="h-4 w-24 rounded mb-4" style={{ background: 'var(--bg-elevated)' }} />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 rounded" style={{ background: 'var(--bg-elevated)', width: `${70 + i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!dna) {
    return (
      <div
        className="rounded-2xl p-5 text-center text-sm"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        No DNA profile available
      </div>
    );
  }

  const totalSentiment = dna.bullishRatio + dna.bearishRatio;
  const bullPercent = totalSentiment > 0 ? (dna.bullishRatio / totalSentiment) * 100 : 50;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        🧬 Guru DNA
      </h3>

      {/* Bullish/Bearish ratio bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: '#34d399' }}>Bullish {bullPercent.toFixed(0)}%</span>
          <span style={{ color: '#f87171' }}>Bearish {(100 - bullPercent).toFixed(0)}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-elevated)' }}>
          <div className="h-full rounded-l-full" style={{ width: `${bullPercent}%`, background: '#34d399' }} />
          <div className="h-full rounded-r-full" style={{ width: `${100 - bullPercent}%`, background: '#f87171' }} />
        </div>
      </div>

      {/* Avg confidence */}
      <div className="flex justify-between items-center text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        <span>Avg Confidence</span>
        <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>
          {dna.avgConfidence.toFixed(0)}%
        </span>
      </div>

      {/* Preferred timeframe */}
      <div className="flex justify-between items-center text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        <span>Preferred Timeframe</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          {dna.preferredTimeframe}
        </span>
      </div>

      {/* Top tickers */}
      {dna.topTickers.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
            Top Tickers
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dna.topTickers.map((ticker) => (
              <span
                key={ticker}
                className="text-xs font-mono px-2 py-1 rounded-md"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trait bars (radar chart alternative) */}
      {dna.traits && dna.traits.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
            Traits
          </span>
          {dna.traits.map((trait) => (
            <div key={trait.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span style={{ color: 'var(--text-secondary)' }}>{trait.label}</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{trait.value}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(trait.value, 100)}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
