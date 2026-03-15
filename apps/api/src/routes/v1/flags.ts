import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import * as flagService from '../../services/feature-flag.service.js';
import type { ApiResponse, FeatureFlagDto } from '@firasa/shared';

export const flagRouter = Router();

/** GET /api/v1/flags — Get flags for current user */
flagRouter.get('/', requireAuth, async (req, res) => {
  const flags = await flagService.listFlags();

  // For non-admins, only return enabled flags relevant to them
  if (req.user!.tier !== 'admin') {
    const userFlags: Record<string, boolean> = {};
    for (const flag of flags) {
      userFlags[flag.name] = await flagService.isEnabled(flag.name, req.user!.id);
    }
    res.json({ success: true, data: userFlags });
    return;
  }

  const response: ApiResponse<FeatureFlagDto[]> = { success: true, data: flags };
  res.json(response);
});

/** PUT /api/v1/flags/:name — Create/update flag (admin only) */
flagRouter.put(
  '/:name',
  requireAuth,
  requireTier('admin'),
  async (req, res) => {
    const flag = await flagService.upsertFlag(req.params.name as string, req.body);
    const response: ApiResponse<FeatureFlagDto> = { success: true, data: flag };
    res.json(response);
  }
);
