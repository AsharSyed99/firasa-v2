'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { SignalDto, GuruDto } from '@firasa/shared';

interface TickerResult { ticker: string; signalCount: number; lastMentioned: string }
interface Results { signals: SignalDto[]; gurus: GuruDto[]; tickers: TickerResult[] }

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length === 0) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.search({ q });
      setResults(res.data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults(null); return; }
    timerRef.current = setTimeout(() => fetchResults(query.trim()), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, fetchResults]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const close = () => { setOpen(false); setQuery(''); setResults(null); };

  const navigate = (path: string) => { close(); router.push(path); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && query.trim()) {
      close();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasResults = results && (results.gurus.length || results.signals.length || results.tickers.length);

  return (
    <>
      {/* Nav trigger button */}
      <button onClick={() => setOpen(true)} className="p-2 text-gray-400 hover:text-gray-200 transition" aria-label="Search">
        <SearchIcon />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-gray-950/80 backdrop-blur-sm" onClick={close}>
          <div className="max-w-lg mx-auto mt-16 px-4" onClick={(e) => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search gurus, signals, tickers..."
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-base"
                maxLength={50}
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-500 hover:text-gray-300">✕</button>
              )}
            </div>

            {/* Dropdown */}
            {loading && <div className="mt-3 text-center text-sm text-gray-500">Searching…</div>}
            {!loading && query.trim() && !hasResults && results && (
              <div className="mt-3 text-center text-sm text-gray-500">No results found</div>
            )}
            {!loading && hasResults && (
              <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {/* Gurus */}
                {results!.gurus.length > 0 && (
                  <ResultGroup title="Gurus">
                    {results!.gurus.map((g) => (
                      <ResultRow key={g.id} onClick={() => navigate(`/gurus/${g.id}`)}>
                        <span className="font-medium">🧠 {g.displayName}</span>
                        <span className="text-xs text-gray-500">@{g.twitterHandle}</span>
                      </ResultRow>
                    ))}
                  </ResultGroup>
                )}
                {/* Tickers */}
                {results!.tickers.length > 0 && (
                  <ResultGroup title="Tickers">
                    {results!.tickers.map((t) => (
                      <ResultRow key={t.ticker} onClick={() => navigate(`/dashboard?ticker=${t.ticker}`)}>
                        <span className="font-mono font-medium">📈 ${t.ticker}</span>
                        <span className="text-xs text-gray-500">{t.signalCount} signals</span>
                      </ResultRow>
                    ))}
                  </ResultGroup>
                )}
                {/* Signals */}
                {results!.signals.length > 0 && (
                  <ResultGroup title="Signals">
                    {results!.signals.map((s) => (
                      <ResultRow key={s.id} onClick={() => navigate(`/dashboard/${s.id}`)}>
                        <span className="truncate">{s.action} {s.tickers.map((t) => `$${t}`).join(' ')} — @{s.guruHandle}</span>
                        <span className="text-xs text-gray-500 shrink-0">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </ResultRow>
                    ))}
                  </ResultGroup>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-800/50">{title}</div>
      {children}
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition text-left text-sm text-gray-200">
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
