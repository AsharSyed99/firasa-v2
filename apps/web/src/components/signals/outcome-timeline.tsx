'use client';

import type { SignalOutcomeDto } from '@firasa/shared';

const OUTCOME_COLORS: Record<string, { dot: string; text: string }> = {
  WIN: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  LOSS: { dot: 'bg-rose-400', text: 'text-rose-400' },
  NEUTRAL: { dot: 'bg-gray-500', text: 'text-gray-400' },
};

const PENDING = { dot: 'bg-gray-700 ring-1 ring-gray-600', text: 'text-gray-600' };

export function OutcomeTimeline({ outcomes }: { outcomes: SignalOutcomeDto[] }) {
  if (!outcomes.length) {
    return (
      <p className="text-xs text-gray-600 italic">No outcome data yet</p>
    );
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {outcomes.map((o, i) => {
        const style = o.outcome ? OUTCOME_COLORS[o.outcome] ?? PENDING : PENDING;
        const changeStr =
          o.changePercent != null
            ? `${o.changePercent >= 0 ? '+' : ''}${o.changePercent.toFixed(1)}%`
            : '—';

        return (
          <div key={o.timeframe} className="flex flex-col items-center min-w-[52px]">
            {/* Connector line */}
            <div className="flex items-center w-full justify-center mb-1">
              {i > 0 && <div className="h-px flex-1 bg-gray-800" />}
              <div className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`} />
              {i < outcomes.length - 1 && <div className="h-px flex-1 bg-gray-800" />}
            </div>
            {/* Label */}
            <span className="text-[10px] font-medium text-gray-400">{o.timeframe}</span>
            {/* Price change */}
            <span className={`text-[10px] font-mono tabular-nums ${style.text}`}>
              {changeStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}
