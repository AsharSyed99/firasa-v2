'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Lock, Check, X } from 'lucide-react';

interface TierFeature {
  label: string;
  included: boolean;
}

interface TierDef {
  id: TierId;
  name: string;
  price: number;
  popular?: boolean;
  features: TierFeature[];
}

const TIERS: TierDef[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      { label: '3 gurus', included: true },
      { label: '5 alerts/day', included: true },
      { label: '7-day history', included: true },
      { label: 'Delayed signals', included: true },
      { label: 'Real-time signals', included: false },
      { label: 'Push notifications', included: false },
      { label: 'API access', included: false },
      { label: 'Custom scoring', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    popular: true,
    features: [
      { label: '20 gurus', included: true },
      { label: '50 alerts/day', included: true },
      { label: '90-day history', included: true },
      { label: 'Real-time signals', included: true },
      { label: 'Push notifications', included: true },
      { label: 'API access', included: false },
      { label: 'Custom scoring', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 29,
    features: [
      { label: '100 gurus', included: true },
      { label: '200 alerts/day', included: true },
      { label: '365-day history', included: true },
      { label: 'Real-time signals', included: true },
      { label: 'Push notifications', included: true },
      { label: 'API access', included: true },
      { label: 'Custom scoring', included: true },
    ],
  },
];

type TierId = 'free' | 'pro' | 'premium';

const TIER_ORDER: Record<TierId, number> = { free: 0, pro: 1, premium: 2 };

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentTier: TierId = (user?.tier as TierId) || 'free';

  const handleUpgrade = async (tier: 'pro' | 'premium') => {
    setLoadingTier(tier);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/api/v1/billing/checkout', { tier });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Choose Your Plan
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Unlock more gurus, faster signals, and deeper insights
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 p-3 rounded-xl text-center text-sm text-red-400"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const isUpgrade = TIER_ORDER[tier.id] > TIER_ORDER[currentTier];
          const isDowngrade = TIER_ORDER[tier.id] < TIER_ORDER[currentTier];

          return (
            <div
              key={tier.id}
              className="relative rounded-2xl p-6 flex flex-col transition-all"
              style={{
                background: isCurrent ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                border: isCurrent
                  ? '2px solid var(--accent)'
                  : '1px solid var(--border)',
              }}
            >
              {tier.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                >
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {tier.name}
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    ${tier.price}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    ) : (
                      <X size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    )}
                    <span style={{ color: feature.included ? 'var(--text-secondary)' : 'var(--text-faint)' }}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  Current Plan
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(tier.id as 'pro' | 'premium')}
                  disabled={loadingTier === tier.id}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                >
                  {loadingTier === tier.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Processing…
                    </span>
                  ) : (
                    `Upgrade to ${tier.name}`
                  )}
                </button>
              ) : isDowngrade ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-semibold opacity-40 cursor-not-allowed"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  <Lock size={14} className="inline mr-1" />
                  Included in your plan
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
