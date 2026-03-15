import type { SignalDto } from '@firasa/shared';
import { ShareButton } from './share-button';

const ACTION_COLORS: Record<string, string> = {
  BUY: 'bg-green-900/50 text-green-300 border-green-700',
  SELL: 'bg-red-900/50 text-red-300 border-red-700',
  HOLD: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  UNCLEAR: 'bg-gray-800 text-gray-400 border-gray-600',
};

const ACTION_EMOJI: Record<string, string> = {
  BUY: '🟢', SELL: '🔴', HOLD: '🟡', UNCLEAR: '⚪',
};

export function SignalCard({ signal }: { signal: SignalDto }) {
  const colorClass = ACTION_COLORS[signal.action] ?? ACTION_COLORS.UNCLEAR;
  const emoji = ACTION_EMOJI[signal.action] ?? '⚪';
  const time = new Date(signal.tweetCreatedAt).toLocaleString();

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="font-bold">{signal.action}</span>
          <span className="text-sm opacity-75">by @{signal.guruHandle}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton signal={signal} />
          <ScoreBadge score={signal.score} />
          {signal.afterHours && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-800 text-purple-200 rounded">AH</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        {signal.tickers.map((t) => (
          <span key={t} className="text-sm font-mono px-2 py-0.5 bg-gray-800 rounded">
            ${t}
          </span>
        ))}
        {signal.entryPrice && (
          <span className="text-sm opacity-75">@ ${signal.entryPrice.toFixed(2)}</span>
        )}
      </div>

      <p className="text-sm opacity-80 line-clamp-2">{signal.tweetText}</p>

      {signal.reasoning && (
        <p className="text-xs opacity-60 mt-2 italic">{signal.reasoning}</p>
      )}

      <div className="text-xs opacity-50 mt-2">{time}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-700 text-green-100' :
    score >= 40 ? 'bg-yellow-700 text-yellow-100' :
    'bg-gray-700 text-gray-300';

  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded ${color}`}>
      {score}
    </span>
  );
}
