/**
 * Auth.js (NextAuth v5) configuration for Firasa.
 *
 * Strategy: JWT sessions + Twitter OAuth 2.0
 * No custom adapter — user upsert handled in signIn callback.
 * Dev bypass via AUTH_DEV_BYPASS=true env var.
 */
import NextAuth, { type NextAuthResult } from 'next-auth';
import Twitter from 'next-auth/providers/twitter';
import { getDb } from '@/lib/server/db';

function cuid(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const nextAuth: NextAuthResult = NextAuth({
  trustHost: true,
  debug: true,
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  // Use non-prefixed cookies so they work in iOS WebView (Capacitor)
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'authjs.callback-url',
      options: {
        httpOnly: false,
        sameSite: 'lax' as const,
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: true,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== 'twitter') return false;

      const db = await getDb();
      const twitterId = account.providerAccountId;

      // Check if this Twitter account is already linked
      const existing = await db.execute(
        `SELECT user_id FROM auth_accounts WHERE provider = 'twitter' AND provider_account_id = '${twitterId}'`
      );

      if (existing.rows.length > 0) {
        // Update profile info
        const userId = (existing.rows[0] as any).user_id;
        await db.execute(
          `UPDATE users SET display_name = '${(user.name || '').replace(/'/g, "''")}',
           photo_url = '${(user.image || '').replace(/'/g, "''")}',
           updated_at = datetime('now')
           WHERE id = '${userId}'`
        );
      } else {
        // Create new user + account link
        const userId = cuid();
        await db.execute(
          `INSERT INTO users (id, firebase_uid, email, display_name, photo_url, tier, onboarding_done, created_at, updated_at)
           VALUES ('${userId}', '${twitterId}', '${(user.email || '').replace(/'/g, "''")}', '${(user.name || '').replace(/'/g, "''")}', '${(user.image || '').replace(/'/g, "''")}', 'free', 0, datetime('now'), datetime('now'))`
        );
        await db.execute(
          `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, provider_handle, access_token, refresh_token, created_at)
           VALUES ('${cuid()}', '${userId}', 'twitter', '${twitterId}', '${(user.name || '').replace(/'/g, "''")}', '${(account.access_token || '').replace(/'/g, "''")}', '${(account.refresh_token || '').replace(/'/g, "''")}', datetime('now'))`
        );
        // Create default preferences
        await db.execute(
          `INSERT INTO user_preferences (id, user_id, alert_threshold, max_alerts_per_day, timezone, push_enabled, created_at, updated_at)
           VALUES ('${cuid()}', '${userId}', 50, 10, 'America/New_York', 1, datetime('now'), datetime('now'))`
        );
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        // First login — look up the user
        const db = await getDb();
        const result = await db.execute(
          `SELECT u.id, u.tier, u.onboarding_done FROM users u
           JOIN auth_accounts a ON a.user_id = u.id
           WHERE a.provider = 'twitter' AND a.provider_account_id = '${account.providerAccountId}'`
        );
        if (result.rows.length > 0) {
          const row = result.rows[0] as any;
          token.userId = row.id;
          token.tier = row.tier;
          token.onboardingDone = !!row.onboarding_done;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        (session as any).userId = token.userId;
        (session as any).tier = token.tier;
        (session as any).onboardingDone = token.onboardingDone;
      }
      return session;
    },
  },
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth: NextAuthResult['auth'] = nextAuth.auth;
