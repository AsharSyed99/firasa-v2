# Firasa v2

Twitter-powered trading intelligence platform. Turns financial gurus' tweets into actionable, scored trade signals.

## Deploy

### Frontend (Vercel) — Already Live
🌐 **https://firasa-opal.vercel.app**

### API (Render) — One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AsharSyed99/firasa-v2)

Click the button above, then fill in the secret env vars when prompted.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Architecture

Turborepo monorepo:
- `apps/api` — Express backend (Node.js/TypeScript)
- `apps/web` — Next.js frontend
- `apps/mobile` — Capacitor wrapper (iOS + Android)
- `packages/database` — Prisma schema + client
- `packages/shared` — Shared types and utilities
- `packages/tsconfig` — Shared TypeScript configs
- `infra/` — Azure Bicep templates

## Getting Started

```bash
npm install
npm run db:generate
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` in `apps/api/`:

```
DATABASE_URL="file:./dev.db"
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY_BASE64=
X_API_BEARER_TOKEN=
GROQ_API_KEY=
FINNHUB_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
