'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { SignalDto, GuruDto } from '@firasa/shared';

interface TickerResult { ticker: string; signalCount: number; lastMentioned: string }
type Tab = 'all' | 'gurus' | 'signals' | 'tickers';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'gurus', label: 'Gurus' },
  { key: 'signals', label: 'Signals' }, { key: 'tickers', label: 'Tickers' },
];

function SearchContent() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState(q);
  const [signals, setSignals] = useState<SignalDto[]>([]);
  const [gurus, setGurus] = useState<GuruDto[]>([]);
  const [tickers, setTickers] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (searchQ: string, searchTab: Tab) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const type = searchTab === 'all' ? undefined : searchTab;
      const res = await api.search({ q: searchQ, type: type as 'signals' | 'gurus' | 'tickers' | undefined });
      setSignals(res.data.signals); setGurus(res.data.gurus); setTickers(res.data.tickers);
    } catch { setSignals([]); setGurus([]); setTickers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user && q) doSearch(q, tab); }, [user, q, tab, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (authLoading) return <Spinner />;
  if (!user) return <div className="p-8 text-center text-gray-400">Please sign in</div>;

  const showGurus = tab === 'all' || tab === 'gurus';
  const showSignals = tab === 'all' || tab === 'signals';
  const showTickers = tab === 'all' || tab === 'tickers';
  const empty = !loading && q && !gurus.length && !signals.length && !tickers.length;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">🔍 Search</h1>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gurus, signals, tickers..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
          maxLength={50}
        />
      </form>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-md font-medium transition ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {/* Gurus */}
      {showGurus && gurus.length > 0 && (
        <Section title="Gurus">
          {gurus.map((g) => (
            <ResultCard key={g.id} onClick={() => router.push(`/gurus/${g.id}`)}>
              <div className="font-medium">🧠 {g.displayName}</div>
              <div className="text-sm text-gray-400">@{g.twitterHandle} · {g.totalSignals} signals · {g.category}</div>
            </ResultCard>
          ))}
        </Section>
      )}

      {/* Tickers */}
      {showTickers && tickers.length > 0 && (
        <Section title="Tickers">
          {tickers.map((t) => (
            <ResultCard key={t.ticker} onClick={() => router.push(`/dashboard?ticker=${t.ticker}`)}>
              <div className="font-mono font-medium">📈 ${t.ticker}</div>
              <div className="text-sm text-gray-400">{t.signalCount} signals · Last: {new Date(t.lastMentioned).toLocaleDateString()}</div>
            </ResultCard>
          ))}
        </Section>
      )}

      {/* Signals */}
      {showSignals && signals.length > 0 && (
        <Section title="Signals">
          {signals.map((s) => (
            <ResultCard key={s.id} onClick={() => router.push(`/dashboard/${s.id}`)}>
              <div className="flex items-center gap-2">
                <ActionBadge action={s.action} />
                <span className="font-mono text-sm">{s.tickers.map((t) => `$${t}`).join(' ')}</span>
                <span className="text-gray-500 text-sm">by @{s.guruHandle}</span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-1 mt-1">{s.tweetText}</p>
            </ResultCard>
          ))}
        </Section>
      )}

      {empty && <p className="text-gray-500 text-center py-12">No results found for &ldquo;{q}&rdquo;</p>}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchContent />
    </Suspense>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultCard({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-600 transition">
      {children}
    </button>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    BUY: 'bg-green-900 text-green-300', SELL: 'bg-red-900 text-red-300',
    HOLD: 'bg-yellow-900 text-yellow-300', UNCLEAR: 'bg-gray-800 text-gray-400',
  };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[action] ?? colors.UNCLEAR}`}>{action}</span>;
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500" /></div>;
}
