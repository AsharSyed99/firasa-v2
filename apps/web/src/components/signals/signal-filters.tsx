import { TrendingUp, TrendingDown, Minus, HelpCircle, LayoutGrid } from 'lucide-react';
import type { ComponentType } from 'react';

interface FilterState {
  guruId?: string;
  action?: string;
}

const ACTIONS = ['ALL', 'BUY', 'SELL', 'HOLD', 'UNCLEAR'] as const;

const FILTER_STYLE: Record<string, { active: string; Icon: ComponentType<{ size?: number }> }> = {
  ALL:     { active: 'bg-[var(--accent-dim)] text-[var(--accent)] ring-1 ring-[var(--accent-ring)]', Icon: LayoutGrid },
  BUY:     { active: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25', Icon: TrendingUp },
  SELL:    { active: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25', Icon: TrendingDown },
  HOLD:    { active: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25', Icon: Minus },
  UNCLEAR: { active: 'bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/25', Icon: HelpCircle },
};

export function SignalFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {ACTIONS.map((action) => {
        const isActive = (action === 'ALL' && !filters.action) || filters.action === action;
        const style = FILTER_STYLE[action] ?? FILTER_STYLE.ALL;
        const { Icon } = style;

        return (
          <button
            key={action}
            onClick={() => onChange({ ...filters, action: action === 'ALL' ? undefined : action })}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? style.active
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            style={!isActive ? { background: 'var(--bg-card)' } : undefined}
          >
            <Icon size={12} />
            {action}
          </button>
        );
      })}
    </div>
  );
}
