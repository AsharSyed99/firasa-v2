'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChevronDown, ChevronUp, Sun } from 'lucide-react';

interface MorningBrief {
  topSignals: { ticker: string; action: string; confidence: number; guruHandle: string }[];
  consensusAlerts: { ticker: string; guruCount: number; sentiment: string }[];
  marketMood: string;
  summary: string;
  generatedAt: string;
}

export function MorningBrief() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    api.get<{ data: MorningBrief }>('/api/v1/me/morning-brief')
      .then((res) => setBrief(res.data))
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 animate-pulse"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="h-4 w-32 rounded mb-3" style={{ background: 'var(--bg-elevated)' }} />
        <div className="space-y-2">
          <div className="h-3 w-full rounded" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-3 w-3/4 rounded" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors"
        style={{ background: expanded ? 'var(--bg-surface-hover)' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <Sun size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Morning Brief
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: brief.marketMood === 'bullish'
                ? 'rgba(52, 211, 153, 0.15)'
                : brief.marketMood === 'bearish'
                  ? 'rgba(248, 113, 113, 0.15)'
                  : 'var(--accent-dim)',
              color: brief.marketMood === 'bullish'
                ? '#34d399'
                : brief.marketMood === 'bearish'
                  ? '#f87171'
                  : 'var(--accent)',
            }}
          >
            {brief.marketMood}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Summary */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {brief.summary}
          </p>

          {/* Top signals */}
          {brief.topSignals.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Top Signals
              </h4>
              <div className="space-y-1.5">
                {brief.topSignals.map((signal, i) => (
                  <div
                    key={`${signal.ticker}-${i}`}
                    className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                        {signal.ticker}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: signal.action === 'BUY' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                          color: signal.action === 'BUY' ? '#34d399' : '#f87171',
                        }}
                      >
                        {signal.action}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      @{signal.guruHandle} · {signal.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consensus alerts */}
          {brief.consensusAlerts.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Consensus Alerts
              </h4>
              <div className="space-y-1.5">
                {brief.consensusAlerts.map((alert, i) => (
                  <div
                    key={`${alert.ticker}-${i}`}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-card)' }}
                  >
                    <span>🎯</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{alert.ticker}</span>
                      {' '}&mdash;{' '}
                      {alert.guruCount} gurus are{' '}
                      <span style={{ color: alert.sentiment === 'bullish' ? '#34d399' : '#f87171' }}>
                        {alert.sentiment.toUpperCase()}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-[11px] text-right" style={{ color: 'var(--text-faint)' }}>
            Generated {new Date(brief.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}
