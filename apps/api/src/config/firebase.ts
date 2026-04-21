import admin from 'firebase-admin';
import { getEnv } from '../config/env.js';
import { createLogger } from './logger.js';

const log = createLogger('firebase');
let initialized = false;
let devMode = false;

/** Initialize Firebase Admin SDK. Call once at startup. */
export function initFirebase(): void {
  if (initialized) return;

  const env = getEnv();

  // Allow running without Firebase (placeholder key = dev mode)
  if (env.FIREBASE_PRIVATE_KEY_BASE64 === 'PLACEHOLDER') {
    log.warn('Firebase credentials not configured — running in dev mode (auth disabled)');
    devMode = true;
    initialized = true;
    return;
  }

  const privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  initialized = true;
  log.info('Firebase Admin initialized');
}

/** Verify a Firebase ID token and return decoded claims */
export async function verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  if (devMode) {
    // In dev mode without Firebase, return a mock token for the dev user
    return {
      uid: 'dev-user-001',
      email: 'dev@firasa.app',
      aud: '', iss: '', sub: 'dev-user-001',
      iat: 0, exp: 0, auth_time: 0, firebase: { sign_in_provider: 'custom', identities: {} },
    } as admin.auth.DecodedIdToken;
  }
  return admin.auth().verifyIdToken(idToken);
}

/** Get Firebase Auth instance for admin operations */
export function getAuth(): admin.auth.Auth {
  return admin.auth();
}

export function isDevMode(): boolean {
  return devMode;
}
