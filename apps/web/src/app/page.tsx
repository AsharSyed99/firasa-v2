'use client';

import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <h1 className="text-4xl font-bold">🔥 Firasa</h1>
        <p className="text-gray-400 text-lg">Trading intelligence from financial gurus</p>
        <button
          onClick={signIn}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome, {user.displayName ?? user.email}</h1>
      <p className="text-gray-400">Tier: {user.tier}</p>
      <div className="flex gap-4 mt-4">
        <a href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
          Dashboard
        </a>
        <a href="/gurus" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
          Gurus
        </a>
        <a href="/trades" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
          Trade Tracker
        </a>
      </div>
    </div>
  );
}
