'use client';

import { usePush } from '@/hooks/use-push';
import { Bell, X, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export function PushPrompt() {
  const { state, subscribe } = usePush();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already subscribed, denied, unsupported, loading, or dismissed
  if (state !== 'prompt' || dismissed) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3 mb-3 animate-fade-in"
      style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-ring)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
      >
        <Bell size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Enable push notifications?
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Get alerted instantly when new signals drop
        </p>
      </div>
      <button
        onClick={subscribe}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition"
        style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
      >
        Enable
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-full shrink-0"
        style={{ color: 'var(--text-faint)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function PushStatus() {
  const { state } = usePush();

  if (state !== 'subscribed') return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent)' }}>
      <CheckCircle size={12} />
      Push notifications active
    </div>
  );
}
