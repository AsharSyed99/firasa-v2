'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api';
import type { GuruDto } from '@firasa/shared';

const CATEGORIES = [
  { id: 'crypto', label: '₿ Crypto', desc: 'Bitcoin, Ethereum, altcoins' },
  { id: 'stocks', label: '📈 Stocks', desc: 'Equities, earnings, growth' },
  { id: 'forex', label: '💱 Forex', desc: 'Currency pairs, FX markets' },
  { id: 'commodities', label: '🪙 Commodities', desc: 'Gold, oil, agriculture' },
];

type Step = 'welcome' | 'interests' | 'gurus' | 'notifications' | 'done';
const STEPS: Step[] = ['welcome', 'interests', 'gurus', 'notifications', 'done'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [gurus, setGurus] = useState<GuruDto[]>([]);
  const [selectedGurus, setSelectedGurus] = useState<Set<string>>(new Set());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      api.getGurus().then((res) => {
        if (res.data) setGurus(res.data);
      });
    }
  }, [user]);

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGuru = (id: string) => {
    setSelectedGurus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === 'granted');
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Follow selected gurus
      for (const guruId of selectedGurus) {
        try {
          await api.post('/api/v1/me/gurus/follow', { guruId });
        } catch { /* ignore duplicate follows */ }
      }
      // Save preferences with interests
      await api.patch('/api/v1/me/preferences', {
        pushEnabled,
        interests: [...interests],
      });
      // Mark onboarding complete
      await api.post('/api/v1/me/onboarding-complete', {});
      window.location.href = '/dashboard';
    } finally {
      setLoading(false);
    }
  };

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100;

  // Top gurus sorted by reliability for recommendation
  const recommendedGurus = [...gurus]
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="h-1 bg-gray-800">
        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome to Firasa 🔥</h1>
            <p className="text-gray-400 text-lg">
              Get real-time trading signals from top Twitter gurus, powered by AI.
            </p>
            {displayName && (
              <p className="text-xl text-emerald-400">
                Hey, {displayName}! Let&apos;s get you set up.
              </p>
            )}
            <div className="space-y-4">
              <label className="block text-sm text-gray-400">What should we call you?</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setStep('interests')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step 2: Select Interests */}
        {step === 'interests' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">What are you interested in?</h2>
            <p className="text-gray-400">Pick the markets you follow. This helps us show relevant signals.</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleInterest(cat.id)}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    interests.has(cat.id)
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-lg">{cat.label}</div>
                  <div className="text-sm text-gray-400 mt-1">{cat.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')} className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep('gurus')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-medium transition"
              >
                Continue ({interests.size} selected)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Follow Recommended Gurus */}
        {step === 'gurus' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Follow at least 3 Gurus</h2>
            <p className="text-gray-400">These are our top-rated trading experts. You can change this later.</p>
            <div className="grid grid-cols-2 gap-3">
              {recommendedGurus.map((guru) => (
                <button
                  key={guru.id}
                  onClick={() => toggleGuru(guru.id)}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    selectedGurus.has(guru.id)
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">{guru.displayName}</div>
                  <div className="text-sm text-gray-400">@{guru.twitterHandle}</div>
                  <div className="text-xs text-emerald-400 mt-1">
                    {(guru.reliability * 100).toFixed(0)}% reliable · {guru.totalSignals} signals
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('interests')} className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep('notifications')}
                disabled={selectedGurus.size < 3}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition"
              >
                Continue ({selectedGurus.size} selected)
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Enable Push Notifications */}
        {step === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Stay in the Loop 🔔</h2>
            <p className="text-gray-400">
              Get instant push notifications when your gurus post new trading signals.
            </p>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">📱</div>
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-gray-400">
                    {pushEnabled ? 'Enabled — you\'ll get real-time alerts!' : 'Enable to never miss a signal'}
                  </div>
                </div>
              </div>
              {!pushEnabled ? (
                <button
                  onClick={requestPushPermission}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-medium transition"
                >
                  Enable Push Notifications
                </button>
              ) : (
                <div className="text-center text-emerald-400 font-medium py-3">
                  ✅ Notifications enabled!
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('gurus')} className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep('done')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-medium transition"
              >
                {pushEnabled ? 'Continue' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <div className="space-y-6 text-center py-12">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold">You&apos;re all set!</h2>
            <p className="text-gray-400 text-lg">
              Your personalized signal feed is ready. Start exploring!
            </p>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 text-left space-y-2">
              <div className="text-sm text-gray-400">Your setup:</div>
              <div className="text-sm">📊 Interests: {interests.size > 0 ? [...interests].join(', ') : 'All'}</div>
              <div className="text-sm">👥 Following: {selectedGurus.size} gurus</div>
              <div className="text-sm">🔔 Notifications: {pushEnabled ? 'On' : 'Off'}</div>
            </div>
            <button
              onClick={completeOnboarding}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-4 rounded-lg font-bold text-lg transition"
            >
              {loading ? 'Setting up...' : 'Go to Dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
