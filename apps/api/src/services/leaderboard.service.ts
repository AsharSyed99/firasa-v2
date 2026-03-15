import { getDb } from './database.js';

export interface LeaderboardEntry {
  guruId: string;
  displayName: string;
  twitterHandle: string;
  category: string;
  totalSignals: number;
  profitableSignals: number;
  winRate: number;
  avgScore: number;
  streak: number; // consecutive wins
  followerCount: number;
  rank: number;
}

export async function getLeaderboard(
  timeframe: 'week' | 'month' | 'all' = 'month',
  limit = 20
): Promise<LeaderboardEntry[]> {
  const db = getDb();

  const since = timeframe === 'week'
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : timeframe === 'month'
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : new Date(0);

  const gurus = await db.guru.findMany({
    where: { isActive: true },
    include: {
      signals: {
        where: { createdAt: { gte: since } },
        select: { score: true, action: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { userConfigs: true },
      },
    },
  });

  const entries: LeaderboardEntry[] = gurus
    .filter((g) => g.signals.length >= 3)
    .map((g) => {
      const total = g.signals.length;
      const profitable = g.signals.filter((s: { score: number }) => s.score >= 70).length;
      const winRate = total > 0 ? (profitable / total) * 100 : 0;
      const avgScore = total > 0 ? g.signals.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / total : 0;

      let streak = 0;
      for (const signal of g.signals) {
        if (signal.score >= 70) streak++;
        else break;
      }

      return {
        guruId: g.id,
        displayName: g.displayName,
        twitterHandle: g.twitterHandle,
        category: g.category,
        totalSignals: total,
        profitableSignals: profitable,
        winRate: Math.round(winRate * 10) / 10,
        avgScore: Math.round(avgScore),
        streak,
        followerCount: g._count.userConfigs,
        rank: 0,
      };
    })
    .sort((a, b) => {
      // Sort by: win rate (primary), then avg score, then total signals
      if (Math.abs(a.winRate - b.winRate) > 1) return b.winRate - a.winRate;
      if (Math.abs(a.avgScore - b.avgScore) > 2) return b.avgScore - a.avgScore;
      return b.totalSignals - a.totalSignals;
    })
    .slice(0, limit);

  // Assign ranks
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}
