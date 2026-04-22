import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Check for NextAuth session cookie or dev bypass
  const hasSession = req.cookies.has('authjs.session-token') || 
                     req.cookies.has('__Secure-authjs.session-token');
  const isDevBypass = req.cookies.has('firasa-dev-auth');
  
  if (!hasSession && !isDevBypass) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect app routes except public ones
    '/((?!login|api|_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js|landing|legal|s/|pricing|onboarding).*)',
  ],
};
