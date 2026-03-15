import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { compareGurus } from '../../services/comparison.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { ComparisonResult } from '../../services/comparison.service.js';

export const compareRouter = Router();

/** GET /api/v1/compare?guru1=X&guru2=Y&days=30 — Head-to-head guru comparison */
compareRouter.get('/', requireAuth, async (req, res) => {
  const { guru1, guru2, days } = req.query;

  if (!guru1 || !guru2) {
    res.status(400).json({ success: false, error: 'Both guru1 and guru2 query params are required' });
    return;
  }

  if (guru1 === guru2) {
    res.status(400).json({ success: false, error: 'Cannot compare a guru with itself' });
    return;
  }

  const dayCount = Math.min(Math.max(Number(days) || 30, 1), 365);
  const result = await compareGurus(guru1 as string, guru2 as string, dayCount);

  if (!result) {
    res.status(404).json({ success: false, error: 'One or both gurus not found' });
    return;
  }

  const response: ApiResponse<ComparisonResult> = { success: true, data: result };
  res.json(response);
});
