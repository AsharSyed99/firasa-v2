import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as earningsService from '../../services/earnings.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { EarningsCalendarEntry } from '../../services/earnings.service.js';

export const earningsRouter = Router();

/** GET /api/v1/earnings?days=14 — Upcoming earnings for tickers with recent signals */
earningsRouter.get('/', requireAuth, async (req, res) => {
  const daysParam = req.query.days;
  const days = daysParam ? Math.min(Math.max(Number(daysParam), 1), 90) : 14;

  const entries = await earningsService.getEarningsCalendar(days);

  const response: ApiResponse<EarningsCalendarEntry[]> = {
    success: true,
    data: entries,
  };
  res.json(response);
});
