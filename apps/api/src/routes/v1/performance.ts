import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/tier-enforcement.js';
import * as performanceService from '../../services/performance.service.js';
import type { ApiResponse } from '@firasa/shared';

export const performanceRouter = Router();
performanceRouter.use(requireAuth, requireFeature('tradeTracker'));

performanceRouter.get('/', async (req, res) => {
  const data = await performanceService.getUserPerformance(req.user!.id);
  const response: ApiResponse<typeof data> = { success: true, data };
  res.json(response);
});
