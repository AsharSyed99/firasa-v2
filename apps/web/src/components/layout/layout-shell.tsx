'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './nav-bar';

const HIDE_NAV_ROUTES = ['/onboarding'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDE_NAV_ROUTES.some((r) => pathname?.startsWith(r));

  return (
    <>
      {children}
      {showNav && <NavBar />}
    </>
  );
}
