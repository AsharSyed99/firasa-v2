'use client';

import { signIn } from 'next-auth/react';
import { FirasaLogo } from '@/components/layout/firasa-logo';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4">
            <FirasaLogo />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome to Firasa
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            فِراسة — Twitter-powered trading intelligence
          </p>
        </div>

        {/* Sign in button */}
        <button
          onClick={() => signIn('twitter', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
          style={{ background: '#1DA1F2' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X (Twitter)
        </button>

        {/* Dev bypass */}
        {process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === 'true' && (
          <button
            onClick={() => {
              document.cookie = 'firasa-dev-auth=true; path=/; max-age=86400';
              window.location.href = '/dashboard';
            }}
            className="w-full px-4 py-3 rounded-xl font-medium text-sm border transition"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Continue as Dev User
          </button>
        )}

        {/* Features preview */}
        <div className="space-y-3 pt-4">
          {[
            { icon: '📊', text: 'Real-time signals from top trading gurus' },
            { icon: '🔔', text: 'Push notifications for new opportunities' },
            { icon: '🏆', text: 'Guru leaderboards and performance tracking' },
            { icon: '🤖', text: 'AI-powered sentiment analysis' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-lg">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
