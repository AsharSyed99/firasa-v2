import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/tier-enforcement.js';
import type { UserTier } from '@firasa/shared';
import * as exportService from '../../services/export.service.js';

export const exportRouter = Router();

/** GET /api/v1/export/signals?from=X&to=Y&guruIds=a,b&actions=BUY,SELL&format=csv */
exportRouter.get('/signals', requireAuth, requireFeature('tradeTracker'), async (req, res) => {
  try {
    const { from, to, guruIds, actions } = req.query;

    const options: exportService.ExportSignalOptions = {};
    if (from && to) {
      options.dateRange = { from: String(from), to: String(to) };
    }
    if (guruIds) options.guruIds = String(guruIds).split(',');
    if (actions) options.actions = String(actions).split(',');

    const csv = await exportService.exportSignals(
      req.user!.id,
      req.user!.tier as UserTier,
      options,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=firasa-signals-${timestamp}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Export signals error:', err);
    res.status(500).json({ success: false, error: 'Failed to export signals' });
  }
});

/** GET /api/v1/export/portfolio?format=csv */
exportRouter.get('/portfolio', requireAuth, requireFeature('portfolio'), async (req, res) => {
  try {
    const csv = await exportService.exportPortfolio(req.user!.id);

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=firasa-portfolio-${timestamp}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Export portfolio error:', err);
    res.status(500).json({ success: false, error: 'Failed to export portfolio' });
  }
});

/** GET /api/v1/export/trades?format=csv */
exportRouter.get('/trades', requireAuth, requireFeature('tradeTracker'), async (req, res) => {
  try {
    const csv = await exportService.exportTradeHistory(
      req.user!.id,
      req.user!.tier as UserTier,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=firasa-trades-${timestamp}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Export trades error:', err);
    res.status(500).json({ success: false, error: 'Failed to export trade history' });
  }
});
