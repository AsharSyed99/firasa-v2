import { auth } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export const middleware: (req: NextRequest) => Promise<any> = auth as any;

export const config = {
  matcher: [
    // Protect all app routes except public ones
    '/((?!login|api/auth|api/cron|api/v1/push/vapid-key|_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js|landing|legal|s/).*)',
  ],
};
