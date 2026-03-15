import type { TradeOutcomeDto } from '@firasa/shared';

export function TradeRow({ trade }: { trade: TradeOutcomeDto }) {
  const { signal, currentPrice, currentAfterHours, changePercent, outcomes } = trade;
  const ticker = signal.tickers[0] ?? '—';

  const changeColor = changePercent
    ? changePercent > 0 ? 'text-green-400' : changePercent < 0 ? 'text-red-400' : 'text-gray-400'
    : 'text-gray-500';

  return (
    <tr className="border-b border-gray-900 hover:bg-gray-900/50">
      <td className="py-2 px-2 font-mono font-bold">${ticker}</td>
      <td className="py-2 px-2">
        <span className={signal.action === 'BUY' ? 'text-green-400' : 'text-red-400'}>
          {signal.action}
        </span>
      </td>
      <td className="py-2 px-2 text-gray-400">@{signal.guruHandle}</td>
      <td className="py-2 px-2 text-right font-mono">
        {signal.entryPrice ? `$${signal.entryPrice.toFixed(2)}` : '—'}
        {signal.afterHours && <Badge text="AH" color="purple" />}
      </td>
      <td className="py-2 px-2 text-right font-mono">
        {currentPrice ? `$${currentPrice.toFixed(2)}` : '—'}
        {currentAfterHours && <Badge text="AH" color="purple" />}
      </td>
      <td className={`py-2 px-2 text-right font-mono ${changeColor}`}>
        {changePercent ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%` : '—'}
      </td>
      {['1h', '4h', '1d', '1w'].map((tf) => {
        const outcome = outcomes.find((o) => o.timeframe === tf);
        return (
          <td key={tf} className="py-2 px-2 text-center">
            <OutcomeBadge outcome={outcome?.outcome ?? null} change={outcome?.changePercent ?? null} />
          </td>
        );
      })}
    </tr>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`ml-1 text-xs px-1 py-0.5 bg-${color}-800 text-${color}-200 rounded`}>
      {text}
    </span>
  );
}

function OutcomeBadge({ outcome, change }: { outcome: string | null; change: number | null }) {
  if (!outcome) return <span className="text-gray-600">—</span>;

  const colors: Record<string, string> = {
    WIN: 'text-green-400',
    LOSS: 'text-red-400',
    NEUTRAL: 'text-gray-400',
  };

  return (
    <span className={colors[outcome] ?? 'text-gray-500'}>
      {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : outcome}
    </span>
  );
}
