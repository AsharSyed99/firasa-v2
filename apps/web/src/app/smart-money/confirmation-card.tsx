import type { SmartMoneyDto } from '../../lib/api';

interface Props {
  data: SmartMoneyDto;
}

export default function ConfirmationCard({ data }: Props) {
  const scoreColor =
    data.confirmationScore >= 70 ? 'text-green-400 border-green-700 bg-green-900/30' :
    data.confirmationScore >= 40 ? 'text-yellow-400 border-yellow-700 bg-yellow-900/30' :
    'text-gray-400 border-gray-700 bg-gray-800';

  const barColor =
    data.confirmationScore >= 70 ? 'bg-green-500' :
    data.confirmationScore >= 40 ? 'bg-yellow-500' :
    'bg-gray-500';

  return (
    <div className={`border rounded-xl p-5 ${scoreColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100">${data.ticker}</h2>
          <p className="text-sm text-gray-400">
            Guru says{' '}
            <span className={
              data.guruSignal.action === 'BUY' ? 'text-green-400' :
              data.guruSignal.action === 'SELL' ? 'text-red-400' : 'text-yellow-400'
            }>
              {data.guruSignal.action}
            </span>
            {' '}(confidence: {(data.guruSignal.confidence * 100).toFixed(0)}%, score: {data.guruSignal.score})
          </p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{data.confirmationScore}</div>
          <div className="text-xs text-gray-500">Confirmation</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(data.confirmationScore, 100)}%` }}
        />
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{data.summary}</p>
    </div>
  );
}
