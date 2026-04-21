import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { enforceGuruLimit } from '../../middleware/tier-enforcement.js';
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
  enforceGuruLimit,
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

/** DELETE /api/v1/me/account — Permanently delete account and all data */
meRouter.delete('/account', async (req, res) => {
  await userService.deleteAccount(req.user!.id);
  res.json({ success: true, data: { message: 'Account permanently deleted' } });
});

/** POST /api/v1/me/push/subscribe — Register a web push subscription */
meRouter.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, error: 'Missing endpoint or keys' });
    return;
  }
  const sub = await userService.upsertWebPushSubscription(req.user!.id, endpoint, keys.p256dh, keys.auth);
  res.json({ success: true, data: sub });
});

/** DELETE /api/v1/me/push/unsubscribe — Remove a web push subscription */
meRouter.delete('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ success: false, error: 'Missing endpoint' });
    return;
  }
  await userService.deleteWebPushSubscription(req.user!.id, endpoint);
  res.json({ success: true, data: { message: 'Unsubscribed' } });
});
