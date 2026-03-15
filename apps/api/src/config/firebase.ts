import admin from 'firebase-admin';
import { getEnv } from '../config/env.js';

let initialized = false;

/** Initialize Firebase Admin SDK. Call once at startup. */
export function initFirebase(): void {
  if (initialized) return;

  const env = getEnv();
  const privateKey = Buffer.from(env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  initialized = true;
  console.log('✅ Firebase Admin initialized');
}

/** Verify a Firebase ID token and return decoded claims */
export async function verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  return admin.auth().verifyIdToken(idToken);
}

/** Get Firebase Auth instance for admin operations */
export function getAuth(): admin.auth.Auth {
  return admin.auth();
}
