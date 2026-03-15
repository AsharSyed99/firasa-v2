'use client';

import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  // Not signed in → show landing page
  if (!user) {
    redirect('/landing');
  }

  // Signed in but not onboarded → onboarding
  if (!user.onboardingDone) {
    redirect('/onboarding');
  }

  // Signed in + onboarded → dashboard
  redirect('/dashboard');
}
