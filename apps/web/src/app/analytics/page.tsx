'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Users, TrendingUp, Activity } from 'lucide-react';

interface OverviewStats {
  totalSignals: number;
  activeGurus: number;
  avgConfidence: number;
  bullBearRatio: { bullish: number; bearish: number };
}

interface LeaderboardEntry {
  guruId: string;
  handle: string;
  displayName: string;
  winRate: number;
  totalSignals: number;
  avgConfidence: number;
  profitFactor: number;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      api.get<{ data: OverviewStats }>('/api/v1/analytics/overview').catch(() => null),
      api.get<{ data: LeaderboardEntry[] }>('/api/v1/gurus/leaderboard').catch(() => null),
    ]).then(([overviewRes, leaderboardRes]) => {
      if (overviewRes?.data) setOverview(overviewRes.data);
      if (leaderboardRes?.data) setLeaderboard(leaderboardRes.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Please sign in</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        📊 Analytics
      </h1>

      {/* Overview Stats */}
      {loading ? (
        <StatsSkeletons />
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={<BarChart3 size={18} />} label="Total Signals" value={String(overview.totalSignals)} />
          <StatCard icon={<Users size={18} />} label="Active Gurus" value={String(overview.activeGurus)} />
          <StatCard icon={<TrendingUp size={18} />} label="Avg Confidence" value={`${overview.avgConfidence}%`} />
          <StatCard
            icon={<Activity size={18} />}
            label="Bull / Bear"
            value={`${overview.bullBearRatio.bullish} / ${overview.bullBearRatio.bearish}`}
          />
        </div>
      ) : (
        <div className="text-center py-8 mb-8" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">No analytics data available yet</p>
        </div>
      )}

      {/* Guru Leaderboard */}
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        🏆 Guru Leaderboard
      </h2>

      {loading ? (
        <LeaderboardSkeleton />
      ) : leaderboard.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>#</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>Guru</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>Win Rate</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>Signals</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>Confidence</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-muted)' }}>Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((guru, i) => (
                  <tr
                    key={guru.guruId}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-faint)' }}>{i + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{guru.displayName}</span>
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>@{guru.handle}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span style={{ color: guru.winRate >= 55 ? '#34d399' : guru.winRate >= 45 ? '#fbbf24' : '#f87171' }}>
                        {guru.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {guru.totalSignals}
                    </td>
                    <td className="py-3 px-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {guru.avgConfidence.toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span style={{ color: guru.profitFactor >= 1 ? '#34d399' : '#f87171' }}>
                        {guru.profitFactor.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">No leaderboard data yet</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function StatsSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="h-3 w-20 rounded mb-3" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-6 w-16 rounded" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      ))}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-2xl p-4 space-y-3 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded" style={{ background: 'var(--bg-elevated)' }} />
      ))}
    </div>
  );
}
