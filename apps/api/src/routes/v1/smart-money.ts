import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTier } from '../../middleware/auth.js';
import * as smartMoney from '../../services/smart-money.service.js';
import type { ApiResponse } from '@firasa/shared';

export const smartMoneyRouter = Router();

/**
 * GET /api/v1/smart-money/market/overview
 * Must be registered BEFORE the :ticker param route.
 */
smartMoneyRouter.get(
  '/market/overview',
  requireAuth,
  requireTier('pro', 'premium'),
  async (_req, res) => {
    const overview = await smartMoney.getMarketOverview();
    const response: ApiResponse<typeof overview> = { success: true, data: overview };
    res.json(response);
  },
);

/**
 * GET /api/v1/smart-money/:ticker
 * Query params: guruAction, guruConfidence, guruScore (optional)
 */
smartMoneyRouter.get(
  '/:ticker',
  requireAuth,
  requireTier('pro', 'premium'),
  async (req, res) => {
    const ticker = (req.params.ticker as string).toUpperCase();
    const guruAction = (req.query.guruAction as string) ?? 'BUY';
    const guruConfidence = Number(req.query.guruConfidence) || 0.5;
    const guruScore = Number(req.query.guruScore) || 50;

    const confirmation = await smartMoney.getSmartMoneyConfirmation(
      ticker, guruAction, guruConfidence, guruScore,
    );

    const response: ApiResponse<typeof confirmation> = { success: true, data: confirmation };
    res.json(response);
  },
);
