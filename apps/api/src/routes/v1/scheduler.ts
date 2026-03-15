import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import * as schedulerService from '../../services/scheduler.service.js';

export const schedulerRouter = Router();

// All scheduler routes require admin
schedulerRouter.use(requireAuth, requireTier('admin'));

/** GET /api/v1/scheduler/status */
schedulerRouter.get('/status', (_req, res) => {
  const status = schedulerService.getSchedulerStatus();
  res.json({ success: true, data: status });
});

/** POST /api/v1/scheduler/start */
schedulerRouter.post('/start', (_req, res) => {
  schedulerService.startScheduler();
  res.json({ success: true, data: schedulerService.getSchedulerStatus() });
});

/** POST /api/v1/scheduler/stop */
schedulerRouter.post('/stop', (_req, res) => {
  schedulerService.stopScheduler();
  res.json({ success: true, data: schedulerService.getSchedulerStatus() });
});
