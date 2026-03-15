import { describe, it, expect, beforeAll } from 'vitest';

// Mock env before importing modules
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY_BASE64 = Buffer.from('test-key').toString('base64');
  process.env.X_API_BEARER_TOKEN = 'test-token';
  process.env.GROQ_API_KEY = 'gsk_test';
  process.env.FINNHUB_API_KEY = 'test-key';
});

describe('env validation', () => {
  it('validates and returns env with all required vars', async () => {
    const { validateEnv, getEnv } = await import('../config/env.js');
    const env = validateEnv();

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3010);
    expect(env.DATABASE_URL).toBe('file:./test.db');

    const cached = getEnv();
    expect(cached).toBe(env);
  });

  it('returns defaults for optional vars', async () => {
    const { getEnv } = await import('../config/env.js');
    const env = getEnv();

    expect(env.CORS_ORIGIN).toBe('http://localhost:3011');
    expect(env.LOG_LEVEL).toBe('info');
  });
});
