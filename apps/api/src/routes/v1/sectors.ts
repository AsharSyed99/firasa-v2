import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getSectorBreakdown } from '../../services/sector.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { SectorBreakdown } from '../../services/sector.service.js';

export const sectorRouter = Router();

/** GET /api/v1/sectors — Signals grouped by market sector */
sectorRouter.get('/', requireAuth, async (req, res) => {
  const hoursParam = Number(req.query.hours) || 24;
  const hours = Math.min(Math.max(hoursParam, 1), 168);

  const sectors = await getSectorBreakdown(hours);

  const response: ApiResponse<SectorBreakdown[]> = { success: true, data: sectors };
  res.json(response);
});
