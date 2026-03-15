import { getDb } from './database.js';
import type { GuruDto, TimeframeWinRate, Timeframe } from '@firasa/shared';
import { TIMEFRAMES } from '@firasa/shared';

/** Get all gurus with computed win rates */
export async function listGurus(includeInactive = false): Promise<GuruDto[]> {
  const db = getDb();

  const where = includeInactive ? {} : { isActive: true };
  const gurus = await db.guru.findMany({ where, orderBy: { displayName: 'asc' } });

  const guruDtos: GuruDto[] = [];
  for (const guru of gurus) {
    const winRates = await computeWinRates(guru.id);
    guruDtos.push(mapGuruToDto(guru, winRates));
  }

  return guruDtos;
}

/** Get single guru by ID */
export async function getGuru(id: string): Promise<GuruDto | null> {
  const db = getDb();
  const guru = await db.guru.findUnique({ where: { id } });
  if (!guru) return null;

  const winRates = await computeWinRates(guru.id);
  return mapGuruToDto(guru, winRates);
}

/** Create a new guru */
export async function createGuru(input: {
  twitterHandle: string;
  displayName: string;
  category?: string;
  reliability?: number;
}): Promise<GuruDto> {
  const db = getDb();
  const guru = await db.guru.create({
    data: {
      twitterHandle: input.twitterHandle,
      displayName: input.displayName,
      category: input.category ?? 'general',
      reliability: input.reliability ?? 0.5,
    },
  });
  return mapGuruToDto(guru, []);
}

/** Update a guru */
export async function updateGuru(
  id: string,
  input: { displayName?: string; category?: string; reliability?: number; isActive?: boolean }
): Promise<GuruDto | null> {
  const db = getDb();
  try {
    const guru = await db.guru.update({ where: { id }, data: input });
    const winRates = await computeWinRates(guru.id);
    return mapGuruToDto(guru, winRates);
  } catch {
    return null;
  }
}

/** Soft-delete (deactivate) or hard-delete a guru */
export async function deleteGuru(id: string, hard = false): Promise<boolean> {
  const db = getDb();
  try {
    if (hard) {
      await db.guru.delete({ where: { id } });
    } else {
      await db.guru.update({ where: { id }, data: { isActive: false } });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute per-timeframe win rates from actual outcome data.
 * Uses outcome fields (outcome1h..outcome1m) from signals.
 */
async function computeWinRates(guruId: string): Promise<TimeframeWinRate[]> {
  const db = getDb();

  const signals = await db.signal.findMany({
    where: { guruId },
    select: {
      outcome1h: true,
      outcome4h: true,
      outcome1d: true,
      outcome3d: true,
      outcome1w: true,
      outcome1m: true,
    },
  });

  const outcomeFieldMap: Record<Timeframe, keyof typeof signals[0]> = {
    '1h': 'outcome1h',
    '4h': 'outcome4h',
    '1d': 'outcome1d',
    '3d': 'outcome3d',
    '1w': 'outcome1w',
    '1m': 'outcome1m',
  };

  return TIMEFRAMES.map((tf) => {
    const field = outcomeFieldMap[tf];
    let wins = 0, losses = 0, neutral = 0;

    for (const signal of signals) {
      const outcome = signal[field];
      if (outcome === 'WIN') wins++;
      else if (outcome === 'LOSS') losses++;
      else if (outcome === 'NEUTRAL') neutral++;
    }

    const total = wins + losses + neutral;
    return {
      timeframe: tf,
      wins,
      losses,
      neutral,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  });
}

function mapGuruToDto(
  guru: {
    id: string;
    twitterHandle: string;
    displayName: string;
    category: string;
    reliability: number;
    isActive: boolean;
    totalSignals: number;
    profitableSignals: number;
    avgScore: number;
    lastPolledAt: Date | null;
  },
  winRates: TimeframeWinRate[]
): GuruDto {
  return {
    id: guru.id,
    twitterHandle: guru.twitterHandle,
    displayName: guru.displayName,
    category: guru.category as GuruDto['category'],
    reliability: guru.reliability,
    isActive: guru.isActive,
    totalSignals: guru.totalSignals,
    profitableSignals: guru.profitableSignals,
    avgScore: guru.avgScore,
    lastPolledAt: guru.lastPolledAt?.toISOString() ?? null,
    winRates,
  };
}
