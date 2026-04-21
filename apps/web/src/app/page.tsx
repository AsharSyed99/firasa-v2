'use client';

import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  // Not signed in → go to dashboard (it has its own sign-in screen)
  if (!user) {
    redirect('/dashboard');
  }

  // Signed in but not onboarded → onboarding
  if (!user.onboardingDone) {
    redirect('/onboarding');
  }

  // Signed in + onboarded → dashboard
  redirect('/dashboard');
}
