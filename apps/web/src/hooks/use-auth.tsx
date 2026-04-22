'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { api } from '@/lib/api';
import type { UserDto } from '@firasa/shared';

const isDevBypass = (process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS || '').startsWith('true');

interface AuthState {
  user: UserDto | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isDevMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Real auth session — fetch full user profile
      api.getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          // Build a user from session data
          setUser({
            id: (session as any).userId || 'unknown',
            email: session.user?.email || '',
            displayName: session.user?.name || null,
            photoUrl: session.user?.image || null,
            tier: (session as any).tier || 'free',
            onboardingDone: (session as any).onboardingDone || false,
            createdAt: new Date().toISOString(),
          });
        })
        .finally(() => setLoading(false));
    } else if (isDevBypass) {
      // Dev bypass
      api.getMe()
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  const handleSignIn = useCallback(async () => {
    await nextAuthSignIn('twitter', { callbackUrl: '/dashboard' });
  }, []);

  const handleSignOut = useCallback(async () => {
    setUser(null);
    await nextAuthSignOut({ callbackUrl: '/login' });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signOut: handleSignOut, isDevMode: isDevBypass }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
