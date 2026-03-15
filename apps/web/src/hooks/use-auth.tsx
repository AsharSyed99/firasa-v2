'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { api } from '@/lib/api';
import type { UserDto } from '@firasa/shared';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase only once
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: UserDto | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const token = await fbUser.getIdToken();
        api.setToken(token);

        try {
          const res = await api.getMe();
          setUser(res.data);
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          setUser(null);
        }
      } else {
        api.setToken(null);
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!firebaseUser) return;

    const interval = setInterval(async () => {
      const token = await firebaseUser.getIdToken(true);
      api.setToken(token);
    }, 50 * 60_000); // Refresh every 50 minutes (tokens expire in 60)

    return () => clearInterval(interval);
  }, [firebaseUser]);

  const signIn = useCallback(async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
    api.setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
