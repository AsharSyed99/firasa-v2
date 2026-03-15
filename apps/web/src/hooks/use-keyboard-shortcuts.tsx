'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SHORTCUTS: Record<string, { key: string; description: string; action: string }> = {
  '/': { key: '/', description: 'Search', action: '/search' },
  'g d': { key: 'g d', description: 'Go to Dashboard', action: '/dashboard' },
  'g g': { key: 'g g', description: 'Go to Gurus', action: '/gurus' },
  'g l': { key: 'g l', description: 'Go to Leaderboard', action: '/leaderboard' },
  'g c': { key: 'g c', description: 'Go to Convergence', action: '/convergence' },
  'g h': { key: 'g h', description: 'Go to Heatmap', action: '/heatmap' },
  'g s': { key: 'g s', description: 'Go to Settings', action: '/settings' },
  'g w': { key: 'g w', description: 'Go to Watchlist', action: '/watchlist' },
  'g m': { key: 'g m', description: 'Go to Mood', action: '/mood' },
  '?': { key: '?', description: 'Show shortcuts', action: 'modal' },
};

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let buffer = '';
    let timer: NodeJS.Timeout;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      buffer += e.key;
      clearTimeout(timer);
      timer = setTimeout(() => { buffer = ''; }, 500);

      // Check for shortcuts
      for (const [combo, shortcut] of Object.entries(SHORTCUTS)) {
        if (buffer.endsWith(combo.replace(' ', ''))) {
          e.preventDefault();
          buffer = '';
          if (shortcut.action === 'modal') {
            window.dispatchEvent(new CustomEvent('firasa:show-shortcuts'));
          } else {
            router.push(shortcut.action);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return SHORTCUTS;
}
