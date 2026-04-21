/**
 * Vercel Serverless Entry Point for Firasa API
 * 
 * Wraps the Express app as a Vercel serverless function.
 * On cold start: validates env, inits Firebase (dev mode),
 * creates SQLite in /tmp, ensures schema, seeds dev user.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Set DATABASE_URL before any Prisma imports
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/tmp/firasa.db';
}

import { validateEnv } from '../src/config/env.js';
import { initLogger } from '../src/config/logger.js';
import { initFirebase } from '../src/config/firebase.js';
import { initWebPush } from '../src/providers/web-push.js';
import { createApp } from '../src/app.js';
import { initDatabase, getDb } from '../src/services/database.js';
import { ensureSchema, seedDevUser } from '../src/schema-init.js';

let app: ReturnType<typeof createApp>;
let initPromise: Promise<void> | null = null;

async function coldStart() {
  validateEnv();
  initLogger();
  initFirebase();
  initWebPush();
  await initDatabase();

  // Create tables + seed dev user on cold start
  const db = getDb();
  await ensureSchema(db);
  await seedDevUser(db);

  app = createApp();
  console.log('✅ Firasa API cold start complete');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initPromise) {
    initPromise = coldStart().catch((err) => {
      console.error('❌ Cold start failed:', err);
      initPromise = null; // Allow retry on next request
      throw err;
    });
  }

  try {
    await initPromise;
  } catch (err: any) {
    return res.status(500).json({
      error: 'API initialization failed',
      message: err?.message || 'Unknown error',
    });
  }

  return app(req, res);
}
