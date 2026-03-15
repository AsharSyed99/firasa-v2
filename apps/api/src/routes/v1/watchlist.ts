import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/tier-enforcement.js';
import * as watchlistService from '../../services/watchlist.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { UserTier } from '@firasa/shared';

export const watchlistRouter = Router();

watchlistRouter.use(requireAuth, requireFeature('watchlist'));

/** GET /api/v1/watchlist — List watchlist items with live prices */
watchlistRouter.get('/', async (req, res) => {
  const items = await watchlistService.getWatchlist(req.user!.id);
  const response: ApiResponse<typeof items> = { success: true, data: items };
  res.json(response);
});

/** POST /api/v1/watchlist — Add a ticker to watchlist */
watchlistRouter.post('/', async (req, res) => {
  const { ticker, notes } = req.body;
  if (!ticker || typeof ticker !== 'string') {
    res.status(400).json({ success: false, error: 'Missing or invalid ticker' });
    return;
  }

  try {
    await watchlistService.addToWatchlist(
      req.user!.id,
      req.user!.tier as UserTier,
      ticker,
      notes
    );
    res.status(201).json({ success: true });
  } catch (err) {
    if (err instanceof watchlistService.WatchlistLimitError) {
      res.status(403).json({ success: false, error: err.message });
      return;
    }
    throw err;
  }
});

/** DELETE /api/v1/watchlist/:ticker — Remove a ticker from watchlist */
watchlistRouter.delete('/:ticker', async (req, res) => {
  await watchlistService.removeFromWatchlist(req.user!.id, req.params.ticker as string);
  res.json({ success: true });
});
