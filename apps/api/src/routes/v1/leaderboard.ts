import { Router } from 'express';
import { getLeaderboard } from '../../services/leaderboard.service.js';
import type { ApiResponse } from '@firasa/shared';

export const leaderboardRouter = Router();

/** GET /api/v1/leaderboard — Public guru rankings */
leaderboardRouter.get('/', async (req, res) => {
  const timeframe = (req.query.timeframe as 'week' | 'month' | 'all') ?? 'month';
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const entries = await getLeaderboard(timeframe, limit);

  const response: ApiResponse<typeof entries> = { success: true, data: entries };
  res.json(response);
});
