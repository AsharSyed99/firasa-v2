'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { UserDto } from '@firasa/shared';

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const isDevMode = !firebaseApiKey || firebaseApiKey === 'placeholder';

// Lazy-load Firebase only when real credentials exist
let firebaseReady: Promise<typeof import('firebase/auth')> | null = null;
if (!isDevMode) {
  firebaseReady = import('firebase/app').then(({ initializeApp, getApps }) => {
    if (getApps().length === 0) {
      initializeApp({
        apiKey: firebaseApiKey,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    return import('firebase/auth');
  });
}

interface AuthState {
  firebaseUser: unknown;
  user: UserDto | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isDevMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<unknown>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Dev mode: auto-login with a dev token
  useEffect(() => {
    if (!isDevMode) return;
    api.setToken('dev-token');
    api.getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Production mode: real Firebase auth
  useEffect(() => {
    if (isDevMode || !firebaseReady) return;

    let unsubscribe: (() => void) | undefined;
    firebaseReady.then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setFirebaseUser(fbUser);
        if (fbUser) {
          const token = await fbUser.getIdToken();
          api.setToken(token);
          try {
            const res = await api.getMe();
            setUser(res.data);
          } catch {
            setUser(null);
          }
        } else {
          api.setToken(null);
          setUser(null);
        }
        setLoading(false);
      });
    });

    return () => unsubscribe?.();
  }, []);

  const signIn = useCallback(async () => {
    if (isDevMode) return;
    if (!firebaseReady) return;
    const { getAuth, signInWithPopup, GoogleAuthProvider } = await firebaseReady;
    const auth = getAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    if (!isDevMode && firebaseReady) {
      const { getAuth, signOut: fbSignOut } = await firebaseReady;
      await fbSignOut(getAuth());
    }
    api.setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signIn, signOut, isDevMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
