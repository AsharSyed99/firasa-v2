import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as correlationService from '../../services/correlation.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { GuruCorrelation } from '../../services/correlation.service.js';

export const correlationRouter = Router();

/** GET /api/v1/correlation?days=30 — Guru correlation map */
correlationRouter.get('/', requireAuth, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const data = await correlationService.getGuruCorrelations(days);
  const response: ApiResponse<GuruCorrelation[]> = { success: true, data };
  res.json(response);
});
