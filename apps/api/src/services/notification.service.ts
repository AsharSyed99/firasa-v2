import { getDb } from './database.js';

export interface CreateNotificationInput {
  type: string;
  title: string;
  body: string;
  data?: string;
}

/** Get paginated notifications for a user */
export async function getUserNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number; cursor?: string }
) {
  const db = getDb();
  const limit = Math.min(opts.limit ?? 20, 100);

  const where: Record<string, unknown> = { userId };
  if (opts.unreadOnly) where.isRead = false;
  if (opts.cursor) where.createdAt = { lt: new Date(opts.cursor) };

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : undefined;

  return {
    data: items.map(mapNotification),
    meta: { limit, cursor: nextCursor },
  };
}

/** Mark a single notification as read */
export async function markAsRead(userId: string, notificationId: string) {
  const db = getDb();
  const notification = await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  return notification.count > 0;
}

/** Mark all notifications as read for a user */
export async function markAllAsRead(userId: string) {
  const db = getDb();
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

/** Get unread notification count */
export async function getUnreadCount(userId: string) {
  const db = getDb();
  return db.notification.count({
    where: { userId, isRead: false },
  });
}

/** Create a single notification */
export async function createNotification(
  userId: string,
  input: CreateNotificationInput
) {
  const db = getDb();
  const notification = await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    },
  });
  return mapNotification(notification);
}

/** Create notifications for multiple users (system announcements) */
export async function createBulkNotifications(
  userIds: string[],
  input: CreateNotificationInput
) {
  const db = getDb();
  const data = userIds.map((userId) => ({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
  }));

  const result = await db.notification.createMany({ data });
  return result.count;
}

function mapNotification(n: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}
