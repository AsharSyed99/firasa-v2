import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import supertest from 'supertest';
import type { Express } from 'express';

// Unique DB per worker to avoid conflicts
const DB_NAME = `firasa-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`;
const DB_PATH = path.join(os.tmpdir(), DB_NAME).replace(/\\/g, '/');
const DB_URL = `file:${DB_PATH}`;

// Set env vars before any app module functions are called
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = DB_URL;
process.env.PORT = '0';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY_BASE64 = 'PLACEHOLDER';
process.env.X_API_BEARER_TOKEN = 'test-token';
process.env.GROQ_API_KEY = 'gsk_test';
process.env.FINNHUB_API_KEY = 'test-key';

import { validateEnv } from '../config/env';
import { initFirebase } from '../config/firebase';
import { initDatabase, getDb } from '../services/database';
import { createApp } from '../app';

export const AUTH_HEADER = { Authorization: 'Bearer test-token' };

export interface TestContext {
  app: Express;
  request: ReturnType<typeof supertest>;
  testData: {
    guru1Id: string;
    guru2Id: string;
    signalIds: string[];
  };
}

let _ctx: TestContext | null = null;

export async function setup(): Promise<TestContext> {
  if (_ctx) return _ctx;

  // Push Prisma schema to test DB
  const schemaPath = path
    .resolve(process.cwd(), '..', '..', 'packages', 'database', 'prisma', 'schema.prisma')
    .replace(/\\/g, '/');

  execSync(
    `npx prisma db push --force-reset --skip-generate --accept-data-loss --schema="${schemaPath}"`,
    { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: 'pipe' },
  );

  // Initialize app systems
  validateEnv();
  initFirebase();
  await initDatabase();

  const app = createApp();
  const request = supertest(app);
  const db = getDb();

  // Seed: user (matching Firebase dev mock uid)
  await db.user.create({
    data: {
      firebaseUid: 'dev-user-001',
      email: 'dev@firasa.app',
      displayName: 'Test User',
      tier: 'pro',
    },
  });

  // Seed: gurus
  const guru1 = await db.guru.create({
    data: {
      twitterHandle: 'stockmaster',
      displayName: 'Stock Master',
      category: 'stocks',
      reliability: 0.8,
      isActive: true,
    },
  });

  const guru2 = await db.guru.create({
    data: {
      twitterHandle: 'cryptoqueen',
      displayName: 'Crypto Queen',
      category: 'crypto',
      reliability: 0.7,
      isActive: true,
    },
  });

  // Seed: signals (sequential for SQLite)
  const s1 = await db.signal.create({
    data: {
      guruId: guru1.id,
      tweetId: 'tweet-001',
      tweetText: 'AAPL looking bullish, buying here $150',
      tweetCreatedAt: new Date(),
      tickers: JSON.stringify(['AAPL']),
      action: 'BUY',
      sentiment: 'BULLISH',
      confidence: 0.85,
      score: 78,
      reasoning: 'Strong support level',
    },
  });

  const s2 = await db.signal.create({
    data: {
      guruId: guru1.id,
      tweetId: 'tweet-002',
      tweetText: 'Selling TSLA, overbought',
      tweetCreatedAt: new Date(),
      tickers: JSON.stringify(['TSLA']),
      action: 'SELL',
      sentiment: 'BEARISH',
      confidence: 0.7,
      score: 65,
    },
  });

  const s3 = await db.signal.create({
    data: {
      guruId: guru2.id,
      tweetId: 'tweet-003',
      tweetText: 'AAPL earnings play, BUY calls',
      tweetCreatedAt: new Date(),
      tickers: JSON.stringify(['AAPL']),
      action: 'BUY',
      sentiment: 'BULLISH',
      confidence: 0.9,
      score: 82,
    },
  });

  _ctx = {
    app,
    request,
    testData: {
      guru1Id: guru1.id,
      guru2Id: guru2.id,
      signalIds: [s1.id, s2.id, s3.id],
    },
  };

  return _ctx;
}

export async function cleanup(): Promise<void> {
  try {
    await getDb().$disconnect();
  } catch { /* ignore */ }

  // Allow file handles to release on Windows
  await new Promise((r) => setTimeout(r, 100));

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { fs.unlinkSync(DB_PATH + suffix); } catch { /* ignore */ }
  }
}
