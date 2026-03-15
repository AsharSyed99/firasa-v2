import { Router } from 'express';
import { getTickerHeatmap } from '../../services/heatmap.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { HeatmapEntry } from '../../services/heatmap.service.js';

export const heatmapRouter = Router();

/** GET /api/v1/heatmap — Public ticker heatmap */
heatmapRouter.get('/', async (req, res) => {
  const hoursParam = Number(req.query.hours) || 24;
  const hours = Math.min(Math.max(hoursParam, 1), 168); // clamp 1h–7d

  const entries = await getTickerHeatmap(hours);

  const response: ApiResponse<HeatmapEntry[]> = { success: true, data: entries };
  res.json(response);
});
