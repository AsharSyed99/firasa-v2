'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import type { GuruDto } from '@firasa/shared';
import { Search, UserPlus, UserMinus, Plus, Loader2 } from 'lucide-react';
import { UpgradeCTA } from '@/components/upgrade-cta';

type Tab = 'discover' | 'following';

const TIER_GURU_LIMITS: Record<string, number> = {
  free: 3,
  pro: 20,
  premium: 100,
  admin: 999,
};

export default function GurusPage() {
  const { user, loading: authLoading } = useAuth();
  const [gurus, setGurus] = useState<GuruDto[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [addHandle, setAddHandle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const tier = (user?.tier as string) || 'free';
  const limit = TIER_GURU_LIMITS[tier] ?? 3;

  const fetchGurus = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.getGurus(),
      api.get<{ data: any[] }>('/api/v1/me/gurus').catch(() => ({ data: [] })),
    ]).then(([gurusRes, followedRes]) => {
      setGurus(gurusRes.data);
      // API returns full guru objects — use .id (not .guruId)
      setFollowedIds(new Set(followedRes.data.map((f) => f.id).filter(Boolean)));
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGurus(); }, [user]);

  const handleAddGuru = async () => {
    if (!addHandle.trim()) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await api.post<{ data: { id: string; displayName: string; twitterHandle: string; alreadyExists: boolean } }>(
        '/api/v1/gurus/add',
        { handle: addHandle.trim() }
      );
      const guru = res.data;
      if (guru.alreadyExists) {
        setAddSuccess(`@${guru.twitterHandle} is already tracked! You can follow them below.`);
      } else {
        setAddSuccess(`Added @${guru.twitterHandle} (${guru.displayName})! Their tweets will be analyzed on the next poll.`);
      }
      setAddHandle('');
      fetchGurus();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add guru');
    } finally {
      setAdding(false);
    }
  };

  const handleFollow = async (guruId: string) => {
    setTogglingId(guruId);
    try {
      await api.post('/api/v1/me/gurus/follow', { guruId });
      setFollowedIds((prev) => new Set([...prev, guruId]));
    } catch (err) {
      console.error('Follow failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnfollow = async (guruId: string) => {
    setTogglingId(guruId);
    try {
      await api.del('/api/v1/me/gurus/unfollow', { guruId });
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(guruId);
        return next;
      });
    } catch (err) {
      console.error('Unfollow failed:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredGurus = useMemo(() => {
    let list = gurus;
    if (tab === 'following') {
      list = list.filter((g) => followedIds.has(g.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.displayName.toLowerCase().includes(q) ||
          g.twitterHandle.toLowerCase().includes(q) ||
          (g.category && g.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [gurus, tab, searchQuery, followedIds]);

  const atLimit = followedIds.size >= limit;

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Please sign in</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>🎯 Gurus</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Following {followedIds.size}/{limit} gurus
      </p>

      {/* Add Guru by Handle */}
      <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          ➕ Add a Guru by Twitter Handle
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-faint)' }}>@</span>
            <input
              type="text"
              placeholder="e.g. elonmusk, CathieDWood, chaaborsi"
              value={addHandle}
              onChange={(e) => { setAddHandle(e.target.value); setAddError(null); setAddSuccess(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGuru()}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              disabled={adding}
            />
          </div>
          <button
            onClick={handleAddGuru}
            disabled={adding || !addHandle.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
        {addError && (
          <p className="text-xs mt-2" style={{ color: '#ef4444' }}>❌ {addError}</p>
        )}
        {addSuccess && (
          <p className="text-xs mt-2" style={{ color: '#22c55e' }}>✅ {addSuccess}</p>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-faint)' }}
        />
        <input
          type="text"
          placeholder="Search gurus by name, handle, or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-card)' }}>
        {(['discover', 'following'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t === 'following' ? `Following (${followedIds.size})` : 'Discover'}
          </button>
        ))}
      </div>

      {/* Upgrade CTA if at limit */}
      {atLimit && tier !== 'premium' && tier !== 'admin' && (
        <div className="mb-5">
          <UpgradeCTA
            feature="Follow more gurus"
            requiredTier={tier === 'free' ? 'pro' : 'premium'}
          />
        </div>
      )}

      {/* Guru grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredGurus.map((guru) => {
          const isFollowing = followedIds.has(guru.id);
          const isToggling = togglingId === guru.id;

          return (
            <div
              key={guru.id}
              className="rounded-xl p-4 transition-all animate-fade-in"
              style={{
                background: 'var(--bg-surface)',
                border: isFollowing ? '1px solid var(--accent-ring)' : '1px solid var(--border)',
              }}
            >
              {/* Avatar + info */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {guru.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {guru.displayName}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    @{guru.twitterHandle}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {guru.category && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {guru.category}
                  </span>
                )}
                <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  {guru.totalSignals} signals
                </span>
                {guru.reliability !== undefined && guru.reliability !== null && (
                  <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
                    {typeof guru.reliability === 'number'
                      ? `${guru.reliability.toFixed(0)}% reliable`
                      : ''}
                  </span>
                )}
              </div>

              {/* Follow/Unfollow button */}
              {isFollowing ? (
                <button
                  onClick={() => handleUnfollow(guru.id)}
                  disabled={isToggling}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {isToggling ? (
                    <span className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                  ) : (
                    <UserMinus size={13} />
                  )}
                  Unfollow
                </button>
              ) : (
                <button
                  onClick={() => handleFollow(guru.id)}
                  disabled={isToggling || (atLimit && !isFollowing)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg-base)',
                  }}
                >
                  {isToggling ? (
                    <span className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  Follow
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredGurus.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {tab === 'following' ? 'You aren\'t following any gurus yet' : 'No gurus found. Add one above!'}
          </p>
        </div>
      )}
    </div>
  );
}
