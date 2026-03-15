import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { pipelineLimiter } from '../../middleware/rate-limit.js';
import * as pipelineService from '../../services/pipeline.service.js';

export const adminOpsRouter = Router();

/** POST /api/v1/admin/sync — Trigger data sync for all active sources (admin only) */
adminOpsRouter.post(
  '/sync',
  requireAuth,
  requireTier('admin'),
  pipelineLimiter,
  async (_req, res) => {
    const results = await pipelineService.runPipelineAll();
    res.json({ success: true, data: results });
  }
);

/** POST /api/v1/admin/sync/:guruId — Trigger sync for a specific source (admin only) */
adminOpsRouter.post(
  '/sync/:guruId',
  requireAuth,
  requireTier('admin'),
  pipelineLimiter,
  async (req, res) => {
    const result = await pipelineService.runPipelineForGuru(req.params.guruId as string);
    res.json({ success: true, data: result });
  }
);
