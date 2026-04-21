'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api';
import type { UserPreferenceDto } from '@firasa/shared';
import { useTheme, THEMES, THEME_META } from '../../hooks/use-theme';
import { Palette, Bell, Shield, User, LogOut, Trash2, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {/* ─── Profile ────────────────────────────────── */}
        <SettingsSection icon={<User size={16} />} title="Profile">
          <div className="space-y-3">
            <SettingsRow label="Email" value={user?.email ?? '—'} />
            <SettingsRow
              label="Plan"
              value={<span style={{ color: 'var(--accent)' }} className="capitalize">{user?.tier ?? 'free'}</span>}
            />
            {user?.tier === 'free' && (
              <div className="mt-3">
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/billing/pricing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Upgrade your plan →
                </a>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Subscriptions are managed on our website
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* ─── Theme ──────────────────────────────────── */}
        <SettingsSection icon={<Palette size={16} />} title="Theme">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {THEMES.map((t) => {
              const meta = THEME_META[t];
              const isActive = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="relative rounded-xl p-3 text-left transition-all"
                  style={{
                    background: isActive ? 'var(--accent-dim)' : 'var(--bg-surface)',
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {/* Color preview swatch */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-5 h-5 rounded-full border border-white/10"
                      style={{ background: meta.preview }}
                    />
                    {isActive && (
                      <Check size={12} style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {meta.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* ─── Alerts ─────────────────────────────────── */}
        <SettingsSection icon={<Bell size={16} />} title="Alerts">
          <div className="space-y-4">
            <ToggleRow
              label="Push Notifications"
              checked={prefs.pushEnabled}
              onChange={(v) => setPrefs({ ...prefs, pushEnabled: v })}
            />
            <ToggleRow
              label="Email Alerts"
              checked={prefs.emailEnabled}
              onChange={(v) => setPrefs({ ...prefs, emailEnabled: v })}
            />
            <ToggleRow
              label="WhatsApp Alerts"
              checked={prefs.whatsappEnabled}
              onChange={(v) => setPrefs({ ...prefs, whatsappEnabled: v })}
            />

            <div>
              <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Min. Signal Score</label>
              <input
                type="range"
                min={0}
                max={100}
                value={prefs.alertThreshold}
                onChange={(e) => setPrefs({ ...prefs, alertThreshold: Number(e.target.value) })}
                className="w-full mt-1"
                style={{ accentColor: 'var(--accent)' }}
              />
              <div className="text-right text-sm font-mono" style={{ color: 'var(--accent)' }}>{prefs.alertThreshold}</div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Quiet From</label>
                <input
                  type="time"
                  value={prefs.quietHoursStart ?? '22:00'}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                  className="w-full rounded px-3 py-2 mt-1"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Quiet Until</label>
                <input
                  type="time"
                  value={prefs.quietHoursEnd ?? '08:00'}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                  className="w-full rounded px-3 py-2 mt-1"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ─── Danger Zone ────────────────────────────── */}
        <SettingsSection icon={<Shield size={16} />} title="Danger Zone" danger>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg text-sm transition"
            >
              <Trash2 size={14} />
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
                className="w-full rounded px-3 py-2"
                style={{ background: 'var(--bg-elevated)', border: '1px solid rgb(127 29 29 / 0.5)', color: 'var(--text-primary)' }}
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
                  className="px-4 py-2 rounded-lg text-sm transition"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SettingsSection>

        {/* ─── Save + Sign Out ────────────────────────── */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={savePrefs}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
          >
            {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable sub-components ─────────────────────────────── */

function SettingsSection({ icon, title, danger, children }: {
  icon: React.ReactNode; title: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-4" style={{ color: danger ? '#f87171' : 'var(--text-secondary)' }}>
        {icon}
        {title}
      </h2>
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${danger ? 'rgb(127 29 29 / 0.3)' : 'var(--border)'}`,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--bg-elevated)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  );
}
