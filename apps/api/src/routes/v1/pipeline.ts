import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { pipelineLimiter } from '../../middleware/rate-limit.js';
import * as pipelineService from '../../services/pipeline.service.js';
import type { ApiResponse, PipelineResult } from '@firasa/shared';

export const pipelineRouter = Router();

/** POST /api/v1/pipeline/run — Trigger pipeline for all active gurus (admin only) */
pipelineRouter.post(
  '/run',
  requireAuth,
  requireTier('admin'),
  pipelineLimiter,
  async (_req, res) => {
    const results = await pipelineService.runPipelineAll();
    const response: ApiResponse<PipelineResult[]> = { success: true, data: results };
    res.json(response);
  }
);

/** POST /api/v1/pipeline/run/:guruId — Trigger pipeline for a specific guru (admin only) */
pipelineRouter.post(
  '/run/:guruId',
  requireAuth,
  requireTier('admin'),
  pipelineLimiter,
  async (req, res) => {
    const result = await pipelineService.runPipelineForGuru(req.params.guruId as string);
    const response: ApiResponse<PipelineResult> = { success: true, data: result };
    res.json(response);
  }
);
