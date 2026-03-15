import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import * as schedulerService from '../../services/scheduler.service.js';

export const adminJobsRouter = Router();

// All job management routes require admin
adminJobsRouter.use(requireAuth, requireTier('admin'));

/** GET /api/v1/admin/jobs/status */
adminJobsRouter.get('/status', (_req, res) => {
  const status = schedulerService.getSchedulerStatus();
  res.json({ success: true, data: status });
});

/** POST /api/v1/admin/jobs/start */
adminJobsRouter.post('/start', (_req, res) => {
  schedulerService.startScheduler();
  res.json({ success: true, data: schedulerService.getSchedulerStatus() });
});

/** POST /api/v1/admin/jobs/stop */
adminJobsRouter.post('/stop', (_req, res) => {
  schedulerService.stopScheduler();
  res.json({ success: true, data: schedulerService.getSchedulerStatus() });
});
