import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { getRecentErrors } from '../../middleware/sentry.js';
import { getBudgetStatus, configureBudget } from '../../services/guru-pool.service.js';
import type { ApiResponse } from '@firasa/shared';

export const adminRouter = Router();

// All admin routes require admin tier
adminRouter.use(requireAuth, requireTier('admin'));

/** GET /api/v1/admin/errors — Recent error log */
adminRouter.get('/errors', (_req, res) => {
  const errors = getRecentErrors();
  const response: ApiResponse<typeof errors> = { success: true, data: errors };
  res.json(response);
});

/** GET /api/v1/admin/budget — Polling budget status */
adminRouter.get('/budget', (_req, res) => {
  const budget = getBudgetStatus();
  const response: ApiResponse<typeof budget> = { success: true, data: budget };
  res.json(response);
});

/** PATCH /api/v1/admin/budget — Configure polling budget */
adminRouter.patch('/budget', (req, res) => {
  const { maxActiveGurus, dailyPollBudget } = req.body;
  configureBudget({ maxActiveGurus, dailyPollBudget });
  const budget = getBudgetStatus();
  const response: ApiResponse<typeof budget> = { success: true, data: budget };
  res.json(response);
});
