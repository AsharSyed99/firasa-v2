import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { LayoutShell } from '../components/layout/layout-shell';

export const metadata: Metadata = {
  title: 'Firasa — Trading Intelligence',
  description: 'Twitter-powered trading signals from financial gurus',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
