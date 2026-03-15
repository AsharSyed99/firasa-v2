'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  signal: '📡',
  convergence: '🎯',
  price_alert: '💰',
  system: '📢',
  billing: '💳',
};

const TYPE_LINKS: Record<string, string> = {
  signal: '/dashboard',
  convergence: '/convergence',
  price_alert: '/alerts',
  system: '/dashboard',
  billing: '/settings',
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const res = await api.getNotifications({
        limit: 20,
        cursor: reset ? undefined : cursor,
      });
      const items = res.data as NotificationDto[];
      if (reset) {
        setNotifications(items);
      } else {
        setNotifications((prev) => [...prev, ...items]);
      }
      setCursor(res.meta?.cursor ?? undefined);
      setHasMore(!!res.meta?.cursor);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    if (user) fetchNotifications(true);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkRead = async (n: NotificationDto) => {
    if (!n.isRead) {
      await api.markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
    }
    const link = n.data ? tryParseLink(n.data) : TYPE_LINKS[n.type] ?? '/dashboard';
    window.location.href = link;
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <div className="p-8 text-center">Please sign in</div>;

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🔔 Notifications</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleMarkRead(n)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-gray-900 hover:bg-gray-800 transition"
          >
            <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] ?? '📢'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                <span className="font-medium truncate">{n.title}</span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-xs text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner />}

      {hasMore && !loading && (
        <button
          onClick={() => fetchNotifications(false)}
          className="w-full mt-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        >
          Load more
        </button>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-gray-400 text-lg">All caught up!</p>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function tryParseLink(data: string): string {
  try {
    const parsed = JSON.parse(data);
    return parsed.link ?? parsed.url ?? '/dashboard';
  } catch {
    return '/dashboard';
  }
}
