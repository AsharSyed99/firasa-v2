'use client';
import { useEffect, useState, useCallback } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const shortcuts = useKeyboardShortcuts();

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    window.addEventListener('firasa:show-shortcuts', handleOpen);
    return () => window.removeEventListener('firasa:show-shortcuts', handleOpen);
  }, [handleOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  if (!open) return null;

  const entries = Object.values(shortcuts);
  const navShortcuts = entries.filter((s) => s.action.startsWith('/'));
  const utilShortcuts = entries.filter((s) => !s.action.startsWith('/'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">⌨️ Keyboard Shortcuts</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <Section title="Navigation" items={navShortcuts} />
        <Section title="Utilities" items={utilShortcuts} />

        <p className="text-xs text-gray-500 mt-4 text-center">
          Press <Kbd>?</Kbd> anytime to toggle this panel
        </p>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: { key: string; description: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((s) => (
          <div key={s.key} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
            <span className="text-sm text-gray-300">{s.description}</span>
            <Kbd>{s.key}</Kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-2 inline-flex items-center rounded border border-gray-600 bg-gray-700 px-1.5 py-0.5 text-xs font-mono text-gray-300">
      {children}
    </kbd>
  );
}
