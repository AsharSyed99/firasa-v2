'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api';
import type { UserPreferenceDto } from '@firasa/shared';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferenceDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      api.getPreferences().then((res) => {
        if (res.data) setPrefs(res.data);
      });
    }
  }, [user]);

  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    await api.updatePreferences(prefs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!prefs) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* Profile Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Profile</h2>
          <div className="bg-gray-900 rounded-xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Plan</span>
              <span className="capitalize text-emerald-400">{user?.tier ?? 'free'}</span>
            </div>
            {user?.tier === 'free' && (
              <div className="mt-3">
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/billing/pricing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  Upgrade your plan →
                </a>
                <p className="text-xs text-gray-600 mt-1">
                  Subscriptions are managed on our website
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Alert Preferences */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Alerts</h2>
          <div className="bg-gray-900 rounded-xl p-5 space-y-4">
            <label className="flex items-center justify-between">
              <span>Push Notifications</span>
              <input
                type="checkbox"
                checked={prefs.pushEnabled}
                onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Email Alerts</span>
              <input
                type="checkbox"
                checked={prefs.emailEnabled}
                onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>WhatsApp Alerts</span>
              <input
                type="checkbox"
                checked={prefs.whatsappEnabled}
                onChange={(e) => setPrefs({ ...prefs, whatsappEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500"
              />
            </label>
            <div>
              <label className="text-sm text-gray-400">Min. Signal Score</label>
              <input
                type="range"
                min={0}
                max={100}
                value={prefs.alertThreshold}
                onChange={(e) => setPrefs({ ...prefs, alertThreshold: Number(e.target.value) })}
                className="w-full mt-1 accent-emerald-500"
              />
              <div className="text-right text-sm text-emerald-400">{prefs.alertThreshold}</div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400">Quiet From</label>
                <input
                  type="time"
                  value={prefs.quietHoursStart ?? '22:00'}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-400">Quiet Until</label>
                <input
                  type="time"
                  value={prefs.quietHoursEnd ?? '08:00'}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white mt-1"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <div className="bg-gray-900 rounded-xl p-5 border border-red-900/50">
            <p className="text-gray-400 text-sm mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg text-sm transition"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-red-400 text-sm font-medium">
                  Type DELETE to confirm permanent account deletion:
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-gray-800 border border-red-900 rounded px-3 py-2 text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await api.deleteAccount();
                        signOut();
                      } catch {
                        setDeleting(false);
                      }
                    }}
                    disabled={deleteInput !== 'DELETE' || deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white rounded-lg text-sm transition"
                  >
                    {deleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Save + Sign Out */}
        <div className="flex gap-3">
          <button
            onClick={savePrefs}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 rounded-lg font-medium transition"
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={signOut}
            className="px-6 py-3 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
