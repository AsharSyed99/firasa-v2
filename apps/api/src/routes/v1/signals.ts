import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { signalFetchLimiter } from '../../middleware/rate-limit.js';
import { enforceHistoryLimit, requireFeature } from '../../middleware/tier-enforcement.js';
import * as signalService from '../../services/signal.service.js';
import type { ApiResponse, SignalDto, SignalDetailDto, TradeOutcomeDto } from '@firasa/shared';

export const signalRouter = Router();

/** GET /api/v1/signals — List signals with cursor pagination */
signalRouter.get('/', requireAuth, signalFetchLimiter, enforceHistoryLimit, async (req, res) => {
  const { guruId, action, limit, cursor } = req.query;

  const result = await signalService.listSignals({
    guruId: guruId as string | undefined,
    action: action as string | undefined,
    limit: limit ? Math.min(Number(limit), 100) : 20,
    cursor: cursor as string | undefined,
  });

  const response: ApiResponse<SignalDto[]> = {
    success: true,
    data: result.signals,
    meta: { cursor: result.nextCursor ?? undefined },
  };
  res.json(response);
});

/** GET /api/v1/signals/:id — Get signal detail with outcomes */
signalRouter.get('/:id', requireAuth, signalFetchLimiter, async (req, res) => {
  const signal = await signalService.getSignalDetail(req.params.id as string);
  if (!signal) {
    res.status(404).json({ success: false, error: 'Signal not found' });
    return;
  }
  const response: ApiResponse<SignalDetailDto> = { success: true, data: signal };
  res.json(response);
});

/** GET /api/v1/trades — Trade tracker with current prices (Pro+) */
signalRouter.get('/trades', requireAuth, requireFeature('tradeTracker'), async (req, res) => {
  const { guruId, limit } = req.query;

  const trades = await signalService.getTradeOutcomes({
    guruId: guruId as string | undefined,
    limit: limit ? Math.min(Number(limit), 100) : 50,
  });

  const response: ApiResponse<TradeOutcomeDto[]> = { success: true, data: trades };
  res.json(response);
});
