'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';

interface UpgradeCTAProps {
  feature: string;
  requiredTier: 'pro' | 'premium';
}

export function UpgradeCTA({ feature, requiredTier }: UpgradeCTAProps) {
  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Premium';

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent-ring)',
      }}
    >
      <Lock size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {feature}
      </span>
      <Link
        href="/pricing"
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
        style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
      >
        Upgrade to {tierLabel}
      </Link>
    </div>
  );
}
