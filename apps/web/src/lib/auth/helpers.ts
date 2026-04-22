/**
 * Auth helper for API routes.
 * Resolves the current user from NextAuth session or dev bypass.
 */
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/server/db';
import { cookies } from 'next/headers';

export interface AuthUser {
  id: string;
  tier: string;
  displayName: string | null;
  onboardingDone: boolean;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  // Check for dev bypass
  if ((process.env.AUTH_DEV_BYPASS || '').startsWith('true')) {
    const cookieStore = await cookies();
    if (cookieStore.get('firasa-dev-auth')?.value === 'true') {
      return { id: 'dev-001', tier: 'admin', displayName: 'Dev User', onboardingDone: true };
    }
  }

  // Check NextAuth session
  const session = await auth();
  if (!session || !(session as any).userId) return null;

  return {
    id: (session as any).userId,
    tier: (session as any).tier || 'free',
    displayName: session.user?.name || null,
    onboardingDone: (session as any).onboardingDone || false,
  };
}

/**
 * Get full user row from DB (for detailed user info).
 */
export async function getFullUser(userId: string) {
  const db = await getDb();
  const result = await db.execute(
    `SELECT u.*, up.alert_threshold, up.max_alerts_per_day, up.timezone, up.push_enabled, up.email_enabled
     FROM users u LEFT JOIN user_preferences up ON up.user_id = u.id
     WHERE u.id = '${userId.replace(/'/g, "''")}'`
  );
  return result.rows[0] || null;
}
