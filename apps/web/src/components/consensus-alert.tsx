'use client';

interface ConsensusAlertProps {
  ticker: string;
  count: number;
  sentiment: string;
}

export function ConsensusAlert({ ticker, count, sentiment }: ConsensusAlertProps) {
  const isBullish = sentiment.toLowerCase() === 'bullish';

  return (
    <div
      className="rounded-xl px-4 py-3 animate-fade-in"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid',
        borderColor: isBullish ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)',
        animation: 'fade-in 0.3s ease-out both, consensus-pulse 2s ease-in-out infinite',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">🎯</span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
          {' '}gurus are{' '}
          <span
            className="font-bold"
            style={{ color: isBullish ? '#34d399' : '#f87171' }}
          >
            {sentiment.toUpperCase()}
          </span>
          {' '}on{' '}
          <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{ticker}</span>
        </span>
      </div>
    </div>
  );
}
