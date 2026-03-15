import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { detectConvergence } from '../../services/convergence.service.js';
import type { ApiResponse } from '@firasa/shared';

export const convergenceRouter = Router();

/** GET /api/v1/convergence — Get active convergence alerts */
convergenceRouter.get('/', requireAuth, async (req, res) => {
  const windowMinutes = Math.min(Number(req.query.window) || 120, 480);
  const minGurus = Math.max(Number(req.query.minGurus) || 2, 2);

  const alerts = await detectConvergence(windowMinutes, minGurus);

  const response: ApiResponse<typeof alerts> = { success: true, data: alerts };
  res.json(response);
});
