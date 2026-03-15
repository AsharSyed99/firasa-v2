import { z } from 'zod';

/**
 * Environment variable schema — validated at startup.
 * Server refuses to start if any required var is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3010),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Firebase Auth
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be valid email'),
  FIREBASE_PRIVATE_KEY_BASE64: z.string().min(1, 'FIREBASE_PRIVATE_KEY_BASE64 is required'),

  // X (Twitter) API
  X_API_BEARER_TOKEN: z.string().min(1, 'X_API_BEARER_TOKEN is required'),

  // Groq LLM
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),

  // Finnhub
  FINNHUB_API_KEY: z.string().min(1, 'FINNHUB_API_KEY is required'),

  // Twilio (optional in dev)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // Stripe (optional until billing is set up)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // App config
  CORS_ORIGIN: z.string().default('http://localhost:3011'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validate and cache environment variables.
 * Call once at startup — throws if validation fails.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`
    );
    console.error('❌ Environment validation failed:\n' + missing.join('\n'));
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

/** Get validated env (must call validateEnv() first) */
export function getEnv(): Env {
  if (!_env) throw new Error('Call validateEnv() before getEnv()');
  return _env;
}
