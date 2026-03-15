'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { api, type PriceAlertDto } from '@/lib/api';

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.getAlerts();
      setAlerts(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user, fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const price = parseFloat(targetPrice);
    if (!ticker.trim() || isNaN(price) || price <= 0) {
      setError('Enter a valid ticker and price');
      return;
    }
    setSubmitting(true);
    try {
      await api.createPriceAlert({ ticker: ticker.trim().toUpperCase(), condition, targetPrice: price });
      setTicker('');
      setTargetPrice('');
      await fetchAlerts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePriceAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto p-4 text-gray-400">Loading...</div>;
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto p-4 text-gray-400">Sign in to manage price alerts.</div>;
  }

  const active = alerts.filter((a) => a.isActive);
  const triggered = alerts.filter((a) => !a.isActive && a.triggeredAt);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🔔 Price Alerts</h1>

      {/* Create alert form */}
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-6 items-end">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="AAPL"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-28 text-sm"
        />
        <button
          type="button"
          onClick={() => setCondition(condition === 'above' ? 'below' : 'above')}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-800 border border-gray-700 hover:bg-gray-700 transition"
        >
          {condition === 'above' ? '↑ Above' : '↓ Below'}
        </button>
        <input
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="150.00"
          type="number"
          step="0.01"
          min="0"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-32 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium transition"
        >
          {submitting ? 'Adding...' : 'Add Alert'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Active alerts */}
      <h2 className="text-lg font-semibold text-gray-300 mb-2">Active ({active.length})</h2>
      {active.length === 0 ? (
        <p className="text-gray-500 text-sm mb-6">No active alerts. Create one above.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {active.map((a) => (
            <AlertRow key={a.id} alert={a} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-300 mb-2">Triggered ({triggered.length})</h2>
          <div className="space-y-2">
            {triggered.map((a) => (
              <AlertRow key={a.id} alert={a} onDelete={handleDelete} triggered />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  onDelete,
  triggered,
}: {
  alert: PriceAlertDto;
  onDelete: (id: string) => void;
  triggered?: boolean;
}) {
  const bg = triggered ? 'bg-green-900/30 border-green-700' : 'bg-gray-800 border-gray-700';
  return (
    <div className={`flex items-center justify-between border rounded-lg px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-sm">{alert.ticker}</span>
        <span className={alert.condition === 'above' ? 'text-green-400' : 'text-red-400'}>
          {alert.condition === 'above' ? '↑' : '↓'}
        </span>
        <span className="text-gray-300 text-sm">${alert.targetPrice.toFixed(2)}</span>
        {triggered && alert.triggeredAt && (
          <span className="text-green-400 text-xs">
            Triggered {new Date(alert.triggeredAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <button
        onClick={() => onDelete(alert.id)}
        className="text-gray-500 hover:text-red-400 text-sm transition"
      >
        ✕
      </button>
    </div>
  );
}
