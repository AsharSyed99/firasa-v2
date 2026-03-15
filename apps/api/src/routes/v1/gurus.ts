import { Router } from 'express';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createGuruSchema, updateGuruSchema } from './schemas/guru.schema.js';
import * as guruService from '../../services/guru.service.js';
import type { ApiResponse, GuruDto } from '@firasa/shared';

export const guruRouter = Router();

/** GET /api/v1/gurus — List all gurus (public, but auth required) */
guruRouter.get('/', requireAuth, async (req, res) => {
  const includeInactive = req.user?.tier === 'admin';
  const gurus = await guruService.listGurus(includeInactive);
  const response: ApiResponse<GuruDto[]> = { success: true, data: gurus };
  res.json(response);
});

/** GET /api/v1/gurus/:id — Get single guru */
guruRouter.get('/:id', requireAuth, async (req, res) => {
  const guru = await guruService.getGuru(req.params.id as string);
  if (!guru) {
    res.status(404).json({ success: false, error: 'Guru not found' });
    return;
  }
  const response: ApiResponse<GuruDto> = { success: true, data: guru };
  res.json(response);
});

/** POST /api/v1/gurus — Create guru (admin only) */
guruRouter.post(
  '/',
  requireAuth,
  requireTier('admin'),
  validateBody(createGuruSchema),
  async (req, res) => {
    const guru = await guruService.createGuru(req.body);
    const response: ApiResponse<GuruDto> = { success: true, data: guru };
    res.status(201).json(response);
  }
);

/** PATCH /api/v1/gurus/:id — Update guru (admin only) */
guruRouter.patch(
  '/:id',
  requireAuth,
  requireTier('admin'),
  validateBody(updateGuruSchema),
  async (req, res) => {
    const guru = await guruService.updateGuru(req.params.id as string, req.body);
    if (!guru) {
      res.status(404).json({ success: false, error: 'Guru not found' });
      return;
    }
    const response: ApiResponse<GuruDto> = { success: true, data: guru };
    res.json(response);
  }
);

/** DELETE /api/v1/gurus/:id — Deactivate guru (admin only, ?hard=true for permanent) */
guruRouter.delete(
  '/:id',
  requireAuth,
  requireTier('admin'),
  async (req, res) => {
    const hard = req.query.hard === 'true';
    const success = await guruService.deleteGuru(req.params.id as string, hard);
    if (!success) {
      res.status(404).json({ success: false, error: 'Guru not found' });
      return;
    }
    res.json({ success: true });
  }
);
