interface FilterState {
  guruId?: string;
  action?: string;
}

const ACTIONS = ['ALL', 'BUY', 'SELL', 'HOLD', 'UNCLEAR'] as const;

export function SignalFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ACTIONS.map((action) => (
        <button
          key={action}
          onClick={() => onChange({ ...filters, action: action === 'ALL' ? undefined : action })}
          className={`px-3 py-1 rounded-lg text-sm transition ${
            (action === 'ALL' && !filters.action) || filters.action === action
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {action}
        </button>
      ))}
    </div>
  );
}
