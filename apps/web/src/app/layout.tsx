import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { LayoutShell } from '../components/layout/layout-shell';
import { PwaInstallPrompt } from '../components/pwa/install-prompt';
import { DisclaimerBanner } from '../components/disclaimer-banner';
import { FooterDisclaimer } from '../components/layout/footer-disclaimer';

export const metadata: Metadata = {
  title: 'Firasa — Trading Intelligence',
  description: 'Twitter-powered trading signals from financial gurus',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-midnight">
      <head>
        {/* iOS native app meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Firasa" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
      </head>
      <body className="bg-[var(--bg-base)] text-[var(--text-primary)] min-h-screen safe-area-inset">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
          <FooterDisclaimer />
          <PwaInstallPrompt />
          <DisclaimerBanner />
        </Providers>
      </body>
    </html>
  );
}
