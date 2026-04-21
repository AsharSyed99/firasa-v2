'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

type PushState = 'loading' | 'unsupported' | 'prompt' | 'subscribed' | 'denied';

/** Convert a base64 URL string to a Uint8Array (for VAPID applicationServerKey) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePush() {
  const [state, setState] = useState<PushState>('loading');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Re-sync subscription to server (in case server lost it)
        const subJson = sub.toJSON();
        try {
          await api.subscribePush({
            endpoint: subJson.endpoint!,
            keys: subJson.keys as { p256dh: string; auth: string },
          });
        } catch { /* best effort */ }
        setState('subscribed');
      } else if (Notification.permission === 'denied') {
        setState('denied');
      } else {
        setState('prompt');
      }
    }).catch(() => {
      setState('unsupported');
    });
  }, []);

  const subscribe = useCallback(async () => {
    try {
      // 1. Get VAPID public key from API
      const res = await fetch(`/api/v1/push/vapid-key`);
      const json = await res.json();
      if (!json.data?.publicKey) throw new Error('No VAPID key');

      // 2. Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // 3. Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(json.data.publicKey).buffer as ArrayBuffer,
      });

      // 4. Send subscription to API
      const subJson = sub.toJSON();
      await api.subscribePush({
        endpoint: subJson.endpoint!,
        keys: subJson.keys as { p256dh: string; auth: string },
      });

      setState('subscribed');
    } catch (err) {
      console.error('Push subscribe failed:', err);
      if (Notification.permission === 'denied') {
        setState('denied');
      }
    }
  }, []);

  return { state, subscribe };
}
