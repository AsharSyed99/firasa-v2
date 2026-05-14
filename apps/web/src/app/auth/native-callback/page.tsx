'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * This page is the OAuth callback landing for native app users.
 * After Twitter OAuth completes in SFSafariViewController, it redirects here.
 * This page attempts to close the browser and signal success back to the app.
 */
export default function NativeCallbackPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Auth succeeded! Try to redirect back to the app via custom scheme
      // The native app's WebView will detect this navigation
      window.location.href = 'firasa://auth-success';
    }
  }, [session, status]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p style={{ color: 'var(--text-primary)' }}>
          {status === 'loading' ? 'Completing sign in...' : 'Sign in successful! Returning to app...'}
        </p>
      </div>
    </div>
  );
}
