import { Router } from 'express';
import type { ApiResponse } from '@firasa/shared';
import { requireAuth } from '../../middleware/auth.js';
import * as priceAlertService from '../../services/price-alert.service.js';

export const priceAlertRouter = Router();

priceAlertRouter.use(requireAuth);

// GET /api/v1/alerts — list user alerts (active + triggered)
priceAlertRouter.get('/', async (req, res) => {
  try {
    const alerts = await priceAlertService.getUserAlerts(req.user!.id);
    const response: ApiResponse<typeof alerts> = { success: true, data: alerts };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/alerts — create a price alert
priceAlertRouter.post('/', async (req, res) => {
  try {
    const { ticker, condition, targetPrice } = req.body;

    if (!ticker || !condition || targetPrice == null) {
      res.status(400).json({ success: false, error: 'ticker, condition, and targetPrice are required' });
      return;
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      res.status(400).json({ success: false, error: 'targetPrice must be a positive number' });
      return;
    }

    const alert = await priceAlertService.createAlert(req.user!.id, {
      ticker,
      condition,
      targetPrice,
    });
    const response: ApiResponse<typeof alert> = { success: true, data: alert };
    res.status(201).json(response);
  } catch (err: any) {
    const status = err.message.includes('limit reached') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/alerts/:id — delete an alert
priceAlertRouter.delete('/:id', async (req, res) => {
  try {
    await priceAlertService.deleteAlert(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});
