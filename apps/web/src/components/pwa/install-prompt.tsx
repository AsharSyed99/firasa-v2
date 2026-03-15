'use client';

import { useEffect, useState, useCallback } from 'react';

const DISMISS_KEY = 'firasa_pwa_dismissed';
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDismissed() || !isMobile()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 safe-area-bottom">
      <div className="mx-auto max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <span className="text-2xl shrink-0">📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100">
            Install Firasa for the best experience
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 transition"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
