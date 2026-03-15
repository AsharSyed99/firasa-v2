import { getDb } from './database.js';

/**
 * Global guru polling budget.
 *
 * X API free tier: 1,500 tweets/month ≈ 50/day.
 * X API Basic ($100/mo): 10,000 tweets/month ≈ 333/day.
 *
 * Each guru poll costs 1 API call. If we poll every 7 minutes during
 * market hours (6.5h = ~56 polls/day per guru), then:
 *   - Free tier: can afford ~1 guru
 *   - Basic tier: can afford ~6 gurus
 *
 * Strategy: prioritize gurus that paid users follow.
 */

interface PoolBudget {
  maxActiveGurus: number;
  dailyPollBudget: number;
  usedToday: number;
}

const DEFAULT_BUDGET: PoolBudget = {
  maxActiveGurus: 10,
  dailyPollBudget: 300,
  usedToday: 0,
};

let budget = { ...DEFAULT_BUDGET };
let budgetDate = todayStr();

/** Get current polling budget status */
export function getBudgetStatus(): PoolBudget & { date: string } {
  resetIfNewDay();
  return { ...budget, date: budgetDate };
}

/** Configure the budget (admin) */
export function configureBudget(config: Partial<Pick<PoolBudget, 'maxActiveGurus' | 'dailyPollBudget'>>): void {
  if (config.maxActiveGurus !== undefined) budget.maxActiveGurus = config.maxActiveGurus;
  if (config.dailyPollBudget !== undefined) budget.dailyPollBudget = config.dailyPollBudget;
}

/** Check if we can afford another poll. Decrements budget if yes. */
export function consumePollCredit(): boolean {
  resetIfNewDay();
  if (budget.usedToday >= budget.dailyPollBudget) return false;
  budget.usedToday++;
  return true;
}

/**
 * Get prioritized list of gurus to poll.
 * Priority: gurus followed by paying users > gurus followed by free users > inactive gurus.
 * Capped at maxActiveGurus.
 */
export async function getPrioritizedGurus(): Promise<string[]> {
  const db = getDb();

  // Count paying subscribers per guru
  const guruPriority = await db.$queryRaw<{ guruId: string; paidFollowers: number }[]>`
    SELECT 
      ugc.guru_id as guruId,
      COUNT(CASE WHEN u.tier IN ('pro', 'premium') THEN 1 END) as paidFollowers
    FROM user_guru_configs ugc
    JOIN users u ON ugc.user_id = u.id
    WHERE ugc.is_following = true
    GROUP BY ugc.guru_id
    ORDER BY paidFollowers DESC
  `;

  // Get all active gurus
  const activeGurus = await db.guru.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const activeIds = new Set(activeGurus.map((g) => g.id));

  // Prioritize: paid-user gurus first, then remaining active gurus
  const prioritized: string[] = [];
  const seen = new Set<string>();

  for (const { guruId } of guruPriority) {
    if (activeIds.has(guruId) && !seen.has(guruId)) {
      prioritized.push(guruId);
      seen.add(guruId);
    }
  }

  // Add remaining active gurus not yet included
  for (const { id } of activeGurus) {
    if (!seen.has(id)) {
      prioritized.push(id);
    }
  }

  // Cap at budget
  return prioritized.slice(0, budget.maxActiveGurus);
}

function resetIfNewDay(): void {
  const today = todayStr();
  if (budgetDate !== today) {
    budget.usedToday = 0;
    budgetDate = today;
  }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
