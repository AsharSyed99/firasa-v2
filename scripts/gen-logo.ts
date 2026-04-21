/**
 * Generate transparent-background Firasa logo PNGs.
 * Run: npx tsx scripts/gen-logo.ts
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const WEB_PUBLIC = resolve(__dirname, '../apps/web/public');

function buildSvg(width: number, height: number, fontSize: number, showSubtitle: boolean): string {
  const subtitleBlock = showSubtitle ? `
    <line x1="${width * 0.2}" y1="${height * 0.62}" x2="${width * 0.8}" y2="${height * 0.62}"
          stroke="#c9a84c" stroke-width="0.5" opacity="0.4" />
    <text x="${width / 2}" y="${height * 0.74}"
          font-family="'Segoe UI', 'Helvetica Neue', sans-serif"
          font-size="${fontSize * 0.18}" font-weight="300" letter-spacing="${fontSize * 0.08}"
          fill="#c9a84c" text-anchor="middle" opacity="0.8">
      TRADING INTELLIGENCE
    </text>
    <text x="${width / 2}" y="${height * 0.88}"
          font-family="'Segoe UI', 'Helvetica Neue', sans-serif"
          font-size="${fontSize * 0.1}" font-weight="300" letter-spacing="${fontSize * 0.04}"
          fill="#94a3b8" text-anchor="middle" opacity="0.5">
      POWERED BY AI + REAL TIME SIGNALS
    </text>
  ` : '';

  const deco = `
    <polygon points="${width * 0.12},${height * 0.18} ${width * 0.12 + 4},${height * 0.18 + 4} ${width * 0.12},${height * 0.18 + 8} ${width * 0.12 - 4},${height * 0.18 + 4}"
             fill="#c9a84c" opacity="0.5" />
    <polygon points="${width * 0.88},${height * 0.18} ${width * 0.88 + 4},${height * 0.18 + 4} ${width * 0.88},${height * 0.18 + 8} ${width * 0.88 - 4},${height * 0.18 + 4}"
             fill="#c9a84c" opacity="0.5" />
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${deco}
  <text x="${width / 2}" y="${height * 0.48}"
        font-family="'Traditional Arabic', 'Noto Naskh Arabic', 'Scheherazade New', 'Amiri', 'Sakkal Majalla', serif"
        font-size="${fontSize}" font-weight="bold"
        fill="url(#gold)" text-anchor="middle" direction="rtl">
    فراسة
  </text>
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8c547" />
      <stop offset="50%" stop-color="#d4a843" />
      <stop offset="100%" stop-color="#c9a84c" />
    </linearGradient>
  </defs>
  ${subtitleBlock}
</svg>`;
}

async function generate() {
  // Banner logo (wide, for header) — transparent background
  const bannerSvg = buildSvg(800, 240, 120, true);
  const bannerPng = await sharp(Buffer.from(bannerSvg))
    .png({ quality: 100 })
    .toBuffer();
  writeFileSync(resolve(WEB_PUBLIC, 'firasa-banner.png'), bannerPng);
  console.log('firasa-banner.png generated');

  // Small logo (for nav, loading screens) — transparent background
  const smallSvg = buildSvg(320, 100, 52, false);
  const smallPng = await sharp(Buffer.from(smallSvg))
    .png({ quality: 100 })
    .toBuffer();
  writeFileSync(resolve(WEB_PUBLIC, 'firasa-logo-transparent.png'), smallPng);
  console.log('firasa-logo-transparent.png generated');
}

generate().catch(console.error);
