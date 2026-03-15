import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { updatePreferencesSchema, updateGuruConfigSchema } from './schemas/user.schema.js';
import * as userService from '../../services/user.service.js';
import type { ApiResponse, UserDto, UserPreferenceDto, UserGuruConfigDto } from '@firasa/shared';

export const meRouter = Router();

// All /me routes require authentication
meRouter.use(requireAuth);

/** GET /api/v1/me — Get current user profile */
meRouter.get('/', async (req, res) => {
  const user = await userService.getUserProfile(req.user!.id);
  const response: ApiResponse<UserDto> = { success: true, data: user! };
  res.json(response);
});

/** GET /api/v1/me/preferences — Get user preferences */
meRouter.get('/preferences', async (req, res) => {
  const prefs = await userService.getPreferences(req.user!.id);
  const response: ApiResponse<UserPreferenceDto> = { success: true, data: prefs };
  res.json(response);
});

/** PATCH /api/v1/me/preferences — Update user preferences */
meRouter.patch(
  '/preferences',
  validateBody(updatePreferencesSchema),
  async (req, res) => {
    const prefs = await userService.updatePreferences(req.user!.id, req.body);
    const response: ApiResponse<UserPreferenceDto> = { success: true, data: prefs };
    res.json(response);
  }
);

/** GET /api/v1/me/gurus — Get user's guru configurations */
meRouter.get('/gurus', async (req, res) => {
  const configs = await userService.getUserGuruConfigs(req.user!.id);
  const response: ApiResponse<UserGuruConfigDto[]> = { success: true, data: configs };
  res.json(response);
});

/** PATCH /api/v1/me/gurus/:guruId — Update guru config (follow/mute/weight) */
meRouter.patch(
  '/gurus/:guruId',
  validateBody(updateGuruConfigSchema),
  async (req, res) => {
    const config = await userService.updateUserGuruConfig(
      req.user!.id,
      req.params.guruId as string,
      req.body
    );
    const response: ApiResponse<UserGuruConfigDto> = { success: true, data: config };
    res.json(response);
  }
);
