import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/tier-enforcement.js';
import * as portfolioService from '../../services/portfolio.service.js';
import type { ApiResponse } from '@firasa/shared';

export const portfolioRouter = Router();

// Portfolio is a Pro+ feature
portfolioRouter.use(requireAuth, requireFeature('portfolio'));

/** GET /api/v1/portfolio — Get full portfolio with current prices */
portfolioRouter.get('/', async (req, res) => {
  const portfolio = await portfolioService.getPortfolio(req.user!.id);
  const response: ApiResponse<typeof portfolio> = { success: true, data: portfolio };
  res.json(response);
});

/** POST /api/v1/portfolio — Add a position */
portfolioRouter.post('/', async (req, res) => {
  const { ticker, shares, avgCost, linkedSignalId } = req.body;
  if (!ticker || !shares || !avgCost) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }
  await portfolioService.addPosition(req.user!.id, { ticker, shares, avgCost, linkedSignalId });
  res.status(201).json({ success: true });
});

/** PATCH /api/v1/portfolio/:id/close — Close a position */
portfolioRouter.patch('/:id/close', async (req, res) => {
  const { closePrice } = req.body;
  if (!closePrice) {
    res.status(400).json({ success: false, error: 'Missing close price' });
    return;
  }
  await portfolioService.closePosition(req.user!.id, req.params.id as string, closePrice);
  res.json({ success: true });
});

/** DELETE /api/v1/portfolio/:id — Delete a position */
portfolioRouter.delete('/:id', async (req, res) => {
  await portfolioService.deletePosition(req.user!.id, req.params.id as string);
  res.json({ success: true });
});
