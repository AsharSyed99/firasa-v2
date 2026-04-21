'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SignalDto } from '@firasa/shared';
import { SignalCard } from '@/components/signals/signal-card';
import { SignalFilters } from '@/components/signals/signal-filters';
import { SignalDetail } from '@/components/signals/signal-detail';
import { FirasaLogo } from '@/components/layout/firasa-logo';
import { Radio, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
import { PushPrompt } from '@/components/push-prompt';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<SignalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<{ guruId?: string; action?: string }>({});
  const [selectedSignal, setSelectedSignal] = useState<SignalDto | null>(null);

  const fetchSignals = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const res = await api.getSignals({
        ...filters,
        limit: 20,
        cursor: reset ? undefined : cursor,
      });
      if (reset) {
        setSignals(res.data);
      } else {
        setSignals((prev) => [...prev, ...res.data]);
      }
      setCursor(res.meta?.cursor ?? undefined);
      setHasMore(!!res.meta?.cursor);
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, cursor]);

  useEffect(() => {
    if (user) fetchSignals(true);
  }, [user, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* ─── Logo banner — full width, centered ─────── */}
      <div className="pt-4 pb-1 -mx-4 px-4">
        <FirasaLogo size="banner" />
      </div>

      {/* ─── Sticky sub-header: live indicator ───────── */}
      <header
        className="sticky top-0 z-30 -mx-4 px-4 py-2.5 mb-3 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--bg-base) 80%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Signal Feed</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Live</span>
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-faint)' }}>
            {signals.length > 0 ? `${signals.length} signals` : ''}
          </span>
        </div>
      </header>

      {/* ─── Filters ────────────────────────────────── */}
      <SignalFilters filters={filters} onChange={(f) => { setFilters(f); setCursor(undefined); }} />

      {/* ─── Push notification prompt ────────────────── */}
      <div className="mt-3">
        <PushPrompt />
      </div>

      {/* ─── Signal Feed ────────────────────────────── */}
      <div className="space-y-3 mt-4">
        {signals.map((signal, i) => (
          <div
            key={signal.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <SignalCard signal={signal} onSelect={setSelectedSignal} />
          </div>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && <SkeletonCards />}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={() => fetchSignals(false)}
          className="w-full mt-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          Load more signals
        </button>
      )}

      {/* Empty state */}
      {!loading && signals.length === 0 && (
        <div className="text-center py-16">
          <Radio size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No signals yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>New signals will appear here as they&apos;re detected</p>
        </div>
      )}

      {/* ─── L2 Detail Panel ────────────────────────── */}
      {selectedSignal && (
        <SignalDetail
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  );
}

/* ─── Skeleton loading ──────────────────────────────────────── */

function SkeletonCards() {
  return (
    <div className="space-y-3 mt-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
            <div className="flex-1">
              <div className="h-3.5 w-32 rounded" style={{ background: 'var(--bg-elevated)' }} />
            </div>
            <div className="h-5 w-12 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
            <div className="w-9 h-9 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
          </div>
          <div className="flex gap-1.5 mb-2.5">
            <div className="h-5 w-14 rounded-md" style={{ background: 'var(--bg-elevated)' }} />
            <div className="h-5 w-14 rounded-md" style={{ background: 'var(--bg-elevated)' }} />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded" style={{ background: 'var(--bg-elevated)' }} />
            <div className="h-3 w-2/3 rounded" style={{ background: 'var(--bg-elevated)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <FirasaLogo size="md" />
      <div className="animate-spin rounded-full h-5 w-5 border-t-2" style={{ borderColor: 'var(--accent)' }} />
    </div>
  );
}

/* ─── Sign-in screen ────────────────────────────────────────── */

function SignInScreen() {
  const { signIn, isDevMode } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signIn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleDevLogin = async () => {
    setSigningIn(true);
    setError(null);
    try {
      api.setToken('dev-token');
      // Reload to trigger the auth effect
      window.location.reload();
    } catch {
      setError('Dev login failed.');
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      {/* Logo — big and prominent */}
      <div className="w-full max-w-md mb-8">
        <FirasaLogo size="banner" />
      </div>

      {/* Sign-in card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 animate-fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome to Firasa
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sign in to access your trading intelligence feed
          </p>
        </div>

        {/* Feature highlights */}
        <div className="space-y-2.5">
          {[
            { icon: <Zap size={14} />, text: 'Real-time AI-powered signals' },
            { icon: <BarChart3 size={14} />, text: 'Track outcomes & guru performance' },
            { icon: <ShieldCheck size={14} />, text: 'Smart alerts & watchlists' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {icon}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
        >
          {signingIn ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        {/* Dev mode bypass */}
        {isDevMode && (
          <button
            onClick={handleDevLogin}
            disabled={signingIn}
            className="w-full py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Continue as Dev User
          </button>
        )}

        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
      </div>

      <p className="text-[11px] mt-6 text-center max-w-xs" style={{ color: 'var(--text-faint)' }}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
        Not financial advice.
      </p>
    </div>
  );
}
