import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as notificationService from '../../services/notification.service.js';
import type { ApiResponse } from '@firasa/shared';

export const notificationRouter = Router();

/** GET /api/v1/notifications — List notifications (paginated) */
notificationRouter.get('/', requireAuth, async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const cursor = req.query.cursor as string | undefined;

  const result = await notificationService.getUserNotifications(req.user!.id, {
    unreadOnly,
    limit,
    cursor,
  });

  res.json({ success: true, ...result });
});

/** GET /api/v1/notifications/count — Unread count */
notificationRouter.get('/count', requireAuth, async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  const response: ApiResponse<{ count: number }> = {
    success: true,
    data: { count },
  };
  res.json(response);
});

/** PATCH /api/v1/notifications/read-all — Mark all as read */
notificationRouter.patch('/read-all', requireAuth, async (req, res) => {
  const updated = await notificationService.markAllAsRead(req.user!.id);
  res.json({ success: true, data: { updated } });
});

/** PATCH /api/v1/notifications/:id/read — Mark single as read */
notificationRouter.patch('/:id/read', requireAuth, async (req, res) => {
  const success = await notificationService.markAsRead(req.user!.id, req.params.id as string);
  if (!success) {
    res.status(404).json({ success: false, error: 'Notification not found' });
    return;
  }
  res.json({ success: true });
});
