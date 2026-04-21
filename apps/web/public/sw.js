// Firasa Service Worker — Web Push Only (no caching)
// This file lives at /sw.js so it has root scope

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Firasa', body: event.data.text() };
  }

  const { title, body, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'Firasa Signal', {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data?.signalId || 'firasa-signal',
      data: data || {},
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'View Signal' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// Activate immediately (skip waiting)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
