# Firasa Deployment Guide

## Architecture

```
Phone/Browser → Vercel (Next.js frontend) → Render (Express API) → SQLite
                                          → Web Push (VAPID)
```

## Current Status

- ✅ **Frontend**: https://firasa-opal.vercel.app (deployed on Vercel)
- ⏳ **API**: Needs Render deployment (see below)

---

## Deploy API to Render (5 minutes)

### Step 1: One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AsharSyed99/firasa-v2)

Click the button above. Render will:
1. Ask you to connect GitHub (if not already)
2. Auto-detect `render.yaml` and configure the service
3. Prompt you to fill in secret env vars

### Step 2: Fill in Environment Variables

When prompted, enter these values (copy from `apps/api/.env`):

| Variable | Value |
|----------|-------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID (or `placeholder` for dev mode) |
| `FIREBASE_CLIENT_EMAIL` | Your Firebase email (or `placeholder`) |
| `FIREBASE_PRIVATE_KEY_BASE64` | Your Firebase key (or `placeholder`) |
| `X_API_BEARER_TOKEN` | Your Twitter/X API bearer token |
| `GROQ_API_KEY` | Your Groq API key |
| `FINNHUB_API_KEY` | Your Finnhub API key |
| `VAPID_PUBLIC_KEY` | `BDWLNJeSEhBWXj1ZnY90K3YpsbOKoCqpaqjaS3aDqhnjiqsfHKh_T8ECqQ-YmqvxfMhgrWtbiVpGmr67LE2cVio` |
| `VAPID_PRIVATE_KEY` | Copy from `apps/api/.env` |

> **Note:** `CORS_ORIGIN`, `NODE_ENV`, `PORT`, `DATABASE_URL`, and `VAPID_SUBJECT` are already set in `render.yaml`.

### Step 3: Update Vercel API URL

After Render deploys, note your API URL (e.g. `https://firasa-api.onrender.com`).

If it's different from `firasa-api`, update on Vercel:
```bash
cd apps/web
vercel env rm NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_API_URL production
# Enter your actual Render URL
vercel --prod
```

### Step 4: Verify

```bash
# Test API
curl https://YOUR-RENDER-URL.onrender.com/api/v1

# Visit frontend
open https://firasa-opal.vercel.app
```

---

## Alternative: Manual Render Setup

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo: `AsharSyed99/firasa-v2`
3. Settings:
   - **Root Directory**: `.` (monorepo root)
   - **Runtime**: Docker
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Plan**: Free
4. Add a **Disk**: mount path `/data`, size 1 GB
5. Set env vars (see table above, plus `NODE_ENV=production`, `PORT=3010`, `DATABASE_URL=file:/data/firasa.db`)
6. Deploy

---

## Push Notifications

Push notifications work automatically:
- VAPID keys are configured in env vars
- Service worker (`/sw.js`) handles receiving notifications
- Users see a prompt to enable notifications on the dashboard
- Works on all modern browsers including iOS Safari 16.4+ ("Add to Home Screen")

---

## Notes

- **Render free tier** spins down after 15 minutes of inactivity (first request takes ~30s)
- **SQLite on Render** uses persistent disk ($0.25/GB/month on paid plan, or 1GB free)
- The API scheduler polls Twitter every 15 minutes — only runs while the service is awake
