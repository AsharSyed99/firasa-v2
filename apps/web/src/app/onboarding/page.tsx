'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api';
import type { GuruDto } from '@firasa/shared';

export default function OnboardingPage() {
  type Step = 'welcome' | 'gurus' | 'alerts' | 'tier';
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [gurus, setGurus] = useState<GuruDto[]>([]);
  const [selectedGurus, setSelectedGurus] = useState<Set<string>>(new Set());
  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.getGurus().then((res) => {
        if (res.data) setGurus(res.data);
      });
    }
  }, [user]);

  const toggleGuru = (id: string) => {
    setSelectedGurus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await api.updatePreferences({
        pushEnabled,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
      });
      window.location.href = '/dashboard';
    } finally {
      setLoading(false);
    }
  };

  const STEPS: Step[] = ['welcome', 'gurus', 'alerts', 'tier'];
  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="h-1 bg-gray-800">
        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {step === 'welcome' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome to Firasa 🔥</h1>
            <p className="text-gray-400 text-lg">
              Get real-time trading signals from top Twitter gurus, powered by AI.
            </p>
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
              onClick={() => setStep('gurus')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition"
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 'gurus' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Pick Your Gurus</h2>
            <p className="text-gray-400">Follow trading experts to get their signals. You can change this later.</p>
            <div className="grid grid-cols-2 gap-3">
              {gurus.map((guru) => (
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
                    {(guru.reliability * 100).toFixed(0)}% reliable
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')} className="px-6 py-3 bg-gray-800 rounded-lg">
                Back
              </button>
              <button
                onClick={() => setStep('alerts')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-medium transition"
              >
                Continue ({selectedGurus.size} selected)
              </button>
            </div>
          </div>
        )}

        {step === 'alerts' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Alert Preferences</h2>
            <p className="text-gray-400">Choose how and when you want to be notified.</p>
            <div className="space-y-4">
              <label className="flex items-center justify-between bg-gray-900 p-4 rounded-xl">
                <span>Push Notifications</span>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500"
                />
              </label>
              <div className="bg-gray-900 p-4 rounded-xl space-y-3">
                <div className="font-medium">Quiet Hours</div>
                <p className="text-sm text-gray-400">No alerts during these times</p>
                <div className="flex gap-4">
                  {[
                    { label: 'From', value: quietStart, set: setQuietStart },
                    { label: 'To', value: quietEnd, set: setQuietEnd },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-xs text-gray-500">{f.label}</label>
                      <input
                        type="time"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="block bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('gurus')} className="px-6 py-3 bg-gray-800 rounded-lg">
                Back
              </button>
              <button
                onClick={() => setStep('tier')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-medium transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'tier' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            <p className="text-gray-400">Start free, upgrade anytime.</p>
            <div className="space-y-4">
              {[
                { name: 'Free', price: '$0', desc: '3 gurus · 5 alerts/day', highlight: false },
                { name: 'Pro', price: '$9.99/mo', desc: '20 gurus · 50 alerts/day · Trade tracker', highlight: true },
                { name: 'Premium', price: '$29.99/mo', desc: '100 gurus · 200 alerts/day · Portfolio', highlight: false },
              ].map((plan) => (
                <div key={plan.name} className={`p-5 rounded-xl border-2 ${
                  plan.highlight ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 bg-gray-900'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg">{plan.name}</div>
                      <div className="text-sm text-gray-400">{plan.desc}</div>
                    </div>
                    <div className="text-xl font-bold text-emerald-400">{plan.price}</div>
                  </div>
                  {plan.highlight && (
                    <div className="mt-2 text-xs text-emerald-500 font-medium">⭐ Most Popular</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={completeOnboarding}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 rounded-lg font-medium transition"
            >
              {loading ? 'Setting up...' : 'Start with Free →'}
            </button>
            <p className="text-center text-xs text-gray-500">You can upgrade anytime from Settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
