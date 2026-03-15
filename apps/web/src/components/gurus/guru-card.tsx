import type { GuruDto } from '@firasa/shared';

export function GuruCard({
  guru,
  isAdmin,
  onToggleActive,
}: {
  guru: GuruDto;
  isAdmin: boolean;
  onToggleActive: (guru: GuruDto) => void;
}) {
  return (
    <div className={`border rounded-lg p-4 ${guru.isActive ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">{guru.displayName}</h3>
          <span className="text-sm text-gray-400">@{guru.twitterHandle}</span>
          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-800 rounded">{guru.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{guru.totalSignals} signals</span>
          {isAdmin && (
            <button
              onClick={() => onToggleActive(guru)}
              className={`text-xs px-3 py-1 rounded transition ${
                guru.isActive
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                  : 'bg-green-900/50 text-green-300 hover:bg-green-900'
              }`}
            >
              {guru.isActive ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      <WinRateGrid winRates={guru.winRates} />
    </div>
  );
}

function WinRateGrid({ winRates }: { winRates: GuruDto['winRates'] }) {
  if (!winRates || winRates.length === 0) return null;

  return (
    <div className="grid grid-cols-6 gap-1 mt-2">
      {winRates.map((wr) => {
        const color = getWinRateColor(wr.winRate, wr.total);
        return (
          <div key={wr.timeframe} className="text-center">
            <div className="text-xs text-gray-500 mb-1">{wr.timeframe}</div>
            <div className={`text-sm font-mono px-1 py-0.5 rounded ${color}`}>
              {wr.total > 0 ? `${wr.winRate}%` : '—'}
            </div>
            <div className="text-xs text-gray-600">{wr.total > 0 ? `${wr.wins}/${wr.total}` : ''}</div>
          </div>
        );
      })}
    </div>
  );
}

function getWinRateColor(rate: number, total: number): string {
  if (total === 0) return 'bg-gray-800 text-gray-500';
  if (rate >= 60) return 'bg-green-900/50 text-green-300';
  if (rate >= 45) return 'bg-yellow-900/50 text-yellow-300';
  return 'bg-red-900/50 text-red-300';
}
