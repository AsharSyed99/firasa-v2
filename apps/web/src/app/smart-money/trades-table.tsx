interface Props {
  title: string;
  trades?: Array<Record<string, unknown>>;
  columns: string[];
}

const LABELS: Record<string, string> = {
  politician: 'Politician',
  action: 'Action',
  amount: 'Amount',
  date: 'Date',
  name: 'Name',
  title: 'Title',
  shares: 'Shares',
};

export default function TradesTable({ title, trades, columns }: Props) {
  if (!trades || trades.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {columns.map((col) => (
                <th key={col} className="text-left text-gray-500 py-2 px-2 font-medium">
                  {LABELS[col] ?? col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr key={i} className="border-b border-gray-800 last:border-0">
                {columns.map((col) => {
                  const value = String(trade[col] ?? '—');
                  const isAction = col === 'action';
                  const actionColor = isAction
                    ? value.toLowerCase().includes('buy') || value.toLowerCase().includes('purchase')
                      ? 'text-green-400'
                      : value.toLowerCase().includes('sell') || value.toLowerCase().includes('sale')
                        ? 'text-red-400'
                        : 'text-gray-300'
                    : 'text-gray-300';

                  return (
                    <td key={col} className={`py-2 px-2 ${actionColor}`}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
