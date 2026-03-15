import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { runBacktest } from '../../services/backtest.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { BacktestResult } from '../../services/backtest.service.js';

export const backtestRouter = Router();

/** POST /api/v1/backtest — Run signal replay backtest (Pro+ only) */
backtestRouter.post('/', requireAuth, requireTier('pro', 'admin'), async (req, res) => {
  const { guruIds, startDate, endDate, initialCapital, positionSize } = req.body;

  if (!startDate || !endDate) {
    res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    return;
  }

  if (!initialCapital || initialCapital <= 0) {
    res.status(400).json({ success: false, error: 'initialCapital must be positive' });
    return;
  }

  const size = Number(positionSize) || 10;
  if (size <= 0 || size > 100) {
    res.status(400).json({ success: false, error: 'positionSize must be between 1 and 100' });
    return;
  }

  const result = await runBacktest({
    guruIds: guruIds?.length ? guruIds : undefined,
    startDate,
    endDate,
    initialCapital: Number(initialCapital),
    positionSize: size,
  });

  const response: ApiResponse<BacktestResult> = { success: true, data: result };
  res.json(response);
});
