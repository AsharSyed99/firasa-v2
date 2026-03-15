import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { generateWeeklyReport } from '../../services/weekly-report.service.js';
import type { ApiResponse } from '@firasa/shared';
import type { WeeklyReport } from '../../services/weekly-report.service.js';

export const weeklyReportRouter = Router();

/** GET /api/v1/weekly-report — Get current user's weekly performance report */
weeklyReportRouter.get('/', requireAuth, async (req, res) => {
  try {
    const report = await generateWeeklyReport(req.user!.id);
    const response: ApiResponse<WeeklyReport> = { success: true, data: report };
    res.json(response);
  } catch (err) {
    console.error('Weekly report error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate weekly report' });
  }
});
