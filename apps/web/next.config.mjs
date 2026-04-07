/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  output: isMobileBuild ? 'export' : 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@firasa/shared'],

  // Images must use unoptimized in static export
  ...(isMobileBuild ? { images: { unoptimized: true } } : {}),

  // Headers only work in server mode
  ...(!isMobileBuild ? {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data:",
                "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'),
                "frame-src https://accounts.google.com https://*.firebaseapp.com https://js.stripe.com",
                "object-src 'none'",
                "base-uri 'self'",
              ].join('; '),
            },
          ],
        },
      ];
    },
  } : {}),
};

export default nextConfig;
