# Firasa Deployment Guide

## Architecture

```
Phone/Browser → Vercel (Next.js frontend) → Render (Express API) → SQLite
                                          → Web Push (VAPID)
```

---

## 1. Deploy API to Render

### Option A: Using render.yaml (Blueprint)
1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and create the service
5. Fill in the env vars marked `sync: false` (see below)

### Option B: Manual Setup
1. Go to Render → **New** → **Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `.` (monorepo root)
4. Set **Dockerfile Path** to `apps/api/Dockerfile`
5. Add a **Disk**: mount path `/data`, size 1 GB
6. Set env vars (see below)

### API Environment Variables (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3010` |
| `DATABASE_URL` | Yes | `file:/data/firasa.db` |
| `CORS_ORIGIN` | Yes | Your Vercel URL, e.g. `https://firasa.vercel.app` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY_BASE64` | Yes | Base64-encoded Firebase private key (use `PLACEHOLDER` for dev mode) |
| `X_API_BEARER_TOKEN` | Yes | Twitter/X API bearer token |
| `GROQ_API_KEY` | Yes | Groq LLM API key |
| `FINNHUB_API_KEY` | Yes | Finnhub API key |
| `VAPID_PUBLIC_KEY` | Yes | Web Push VAPID public key (from your .env) |
| `VAPID_PRIVATE_KEY` | Yes | Web Push VAPID private key (from your .env) |
| `VAPID_SUBJECT` | Yes | `mailto:support@firasa.app` |
| `TWILIO_ACCOUNT_SID` | No | For WhatsApp alerts |
| `TWILIO_AUTH_TOKEN` | No | For WhatsApp alerts |
| `TWILIO_WHATSAPP_FROM` | No | For WhatsApp alerts |
| `STRIPE_SECRET_KEY` | No | For billing |

After deploying, note your Render URL (e.g. `https://firasa-api.onrender.com`).

---

## 2. Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `apps/web`
4. Vercel will auto-detect Next.js
5. Set env vars (see below)
6. Deploy!

### Frontend Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Your Render URL, e.g. `https://firasa-api.onrender.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No* | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No* | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No* | Firebase project ID |

\* Required for Google Sign-In in production. Without these, the app runs in dev mode with auto-login.

---

## 3. Post-Deployment Checklist

- [ ] Set `CORS_ORIGIN` on Render to your Vercel URL
- [ ] Set `NEXT_PUBLIC_API_URL` on Vercel to your Render URL
- [ ] Test the API: `curl https://your-api.onrender.com/api/v1`
- [ ] Test the frontend: visit your Vercel URL
- [ ] Enable push notifications in your browser
- [ ] Verify signals load on your phone browser

---

## 4. Push Notifications Setup

Push notifications work out of the box with Web Push (VAPID):
- VAPID keys are already generated in your `.env`
- Copy the same keys to Render env vars
- The service worker (`/sw.js`) handles receiving notifications
- Users will see a prompt to enable notifications on the dashboard

### Testing Push Locally
```bash
# Send a test push from the API
curl -X POST http://localhost:3010/api/v1/admin/test-push \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json"
```

---

## 5. Custom Domain (Optional)

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add `firasa.app` or `app.firasa.app`
3. Update DNS records as instructed

### Render (API)
1. Go to Service Settings → Custom Domain
2. Add `api.firasa.app`
3. Update DNS records as instructed
4. Update `CORS_ORIGIN` to match the new frontend domain
5. Update `NEXT_PUBLIC_API_URL` on Vercel to match the new API domain

---

## Notes

- **Render free tier** spins down after 15 minutes of inactivity (first request takes ~30s)
- **SQLite on Render** requires a persistent disk ($0.25/GB/month on paid plan, included in free tier for 1GB)
- **Push notifications** work on all modern browsers including iOS Safari 16.4+ (user must "Add to Home Screen")
- The API runs a scheduler for polling Twitter — on free tier, this only runs while the service is awake
